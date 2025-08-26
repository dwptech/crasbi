from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db import transaction
import time
import pyodbc
from .models import SourceConnection, Job, JobExecution
from .serializers import (
    SourceConnectionSerializer, JobSerializer, JobDetailSerializer,
    JobExecutionSerializer, JobExecutionSummarySerializer
)

class SourceConnectionViewSet(viewsets.ModelViewSet):
    queryset = SourceConnection.objects.all()
    serializer_class = SourceConnectionSerializer
    permission_classes = []  # No authentication required
    filter_backends = [SearchFilter, OrderingFilter, DjangoFilterBackend]
    search_fields = ['source_name', 'host', 'username', 'db_type']
    ordering_fields = ['source_name', 'db_type', 'host', 'created_at', 'is_active']
    ordering = ['-created_at']
    filterset_fields = ['db_type', 'is_active']

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle the active status of a source connection"""
        source_connection = self.get_object()
        source_connection.is_active = not source_connection.is_active
        source_connection.save()
        serializer = self.get_serializer(source_connection)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def active_connections(self, request):
        """Get only active source connections"""
        connections = SourceConnection.objects.filter(is_active=True)
        serializer = self.get_serializer(connections, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_db_type(self, request):
        """Get source connections grouped by database type"""
        db_type = request.query_params.get('db_type', None)
        if db_type:
            connections = SourceConnection.objects.filter(db_type=db_type)
        else:
            connections = SourceConnection.objects.all()
        
        serializer = self.get_serializer(connections, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def connection_info(self, request, pk=None):
        """Get connection string and basic info without password"""
        source_connection = self.get_object()
        data = {
            'id': source_connection.id,
            'source_name': source_connection.source_name,
            'db_type': source_connection.db_type,
            'host': source_connection.host,
            'port': source_connection.port,
            'username': source_connection.username,
            'is_active': source_connection.is_active,
            'connection_string': source_connection.get_connection_string()
        }
        return Response(data)

class JobViewSet(viewsets.ModelViewSet):
    queryset = Job.objects.select_related('source').all()
    permission_classes = []
    filter_backends = [SearchFilter, OrderingFilter, DjangoFilterBackend]
    search_fields = ['job_name', 'source_table', 'target_table', 'created_by']
    ordering_fields = ['job_name', 'created_at', 'updated_at']
    ordering = ['-created_at']
    filterset_fields = ['source', 'created_by']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return JobDetailSerializer
        return JobSerializer

    @action(detail=False, methods=['get'])
    def by_source(self, request):
        source_id = request.query_params.get('source_id')
        qs = self.queryset
        if source_id:
            qs = qs.filter(source_id=source_id)
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = JobSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = JobSerializer(qs, many=True)
        return Response(serializer.data)

class ETLViewSet(viewsets.ViewSet):
    """
    ETL ViewSet for executing ETL jobs
    """
    permission_classes = []

    @action(detail=False, methods=['get'])
    def active_sources(self, request):
        """Get all active source connections for ETL menu"""
        sources = SourceConnection.objects.filter(is_active=True)
        serializer = SourceConnectionSerializer(sources, many=True)
        return Response({
            'message': 'Active source connections retrieved successfully',
            'sources': serializer.data
        })

    @action(detail=False, methods=['post'])
    def run_etl(self, request):
        """
        Main ETL execution endpoint
        Flow: Select Source → Fetch Jobs → Execute Sequentially → Track Status
        """
        print("🚀 ETL PROCESS STARTED")
        print(f"📝 Request data: {request.data}")
        
        source_id = request.data.get('source_id')
        executed_by = request.data.get('executed_by', 'system')

        print(f"🎯 Source ID: {source_id}")
        print(f"👤 Executed by: {executed_by}")

        if not source_id:
            print("❌ ERROR: source_id is required")
            return Response(
                {'error': 'source_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Step 1: Get source connection details
            print(f"🔍 Step 1: Getting source connection details for ID: {source_id}")
            source_connection = SourceConnection.objects.get(id=source_id, is_active=True)
            print(f"✅ Source connection found: {source_connection.source_name} ({source_connection.db_type})")
            
            # Step 2: Fetch all jobs for this source
            print(f"🔍 Step 2: Fetching jobs for source: {source_connection.source_name}")
            jobs = Job.objects.filter(source_id=source_id)
            print(f"📊 Found {jobs.count()} jobs for this source")
            
            if not jobs.exists():
                print(f"⚠️ No jobs found for source: {source_connection.source_name}")
                return Response({
                    'message': f'No jobs found for source: {source_connection.source_name}',
                    'source_name': source_connection.source_name,
                    'jobs_count': 0
                })

            # Step 3: Execute jobs sequentially (not in parallel)
            print(f"🔄 Step 3: Starting sequential job execution for {jobs.count()} jobs")
            execution_results = []
            
            for index, job in enumerate(jobs, 1):
                print(f"\n📋 Job {index}/{len(jobs)}: {job.job_name}")
                print(f"   Source table: {job.source_table}")
                print(f"   Target table: {job.target_table}")
                
                try:
                    # Create execution record
                    print(f"   📝 Creating execution record...")
                    execution = JobExecution.objects.create(
                        job=job,
                        source_name=source_connection.source_name,
                        job_name=job.job_name,
                        status='running',
                        executed_by=executed_by
                    )
                    print(f"   ✅ Execution record created with ID: {execution.id}")

                    # Execute the job
                    print(f"   ⚡ Executing job...")
                    result = self._execute_job(job, source_connection, execution)
                    execution_results.append(result)
                    print(f"   ✅ Job completed successfully: {result}")

                except Exception as e:
                    print(f"   ❌ Job failed with error: {str(e)}")
                    # Mark execution as failed
                    if 'execution' in locals():
                        execution.status = 'failed'
                        execution.error_message = str(e)
                        execution.completed_at = timezone.now()
                        execution.save()
                        print(f"   📝 Execution record updated with failure status")

                    execution_results.append({
                        'job_id': job.id,
                        'job_name': job.job_name,
                        'status': 'failed',
                        'error': str(e)
                    })

            print(f"\n🎉 ETL PROCESS COMPLETED")
            print(f"📊 Total jobs processed: {len(jobs)}")
            print(f"✅ Successful: {len([r for r in execution_results if r.get('status') == 'completed'])}")
            print(f"❌ Failed: {len([r for r in execution_results if r.get('status') == 'failed'])}")
            
            return Response({
                'message': f'ETL execution completed for source: {source_connection.source_name}',
                'source_name': source_connection.source_name,
                'total_jobs': len(jobs),
                'execution_results': execution_results
            })

        except SourceConnection.DoesNotExist:
            print(f"❌ ERROR: Source connection with id {source_id} not found or inactive")
            return Response(
                {'error': f'Source connection with id {source_id} not found or inactive'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            print(f"❌ CRITICAL ERROR: ETL execution failed: {str(e)}")
            return Response(
                {'error': f'ETL execution failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _execute_job(self, job, source_connection, execution):
        """
        Execute a single ETL job
        """
        print(f"   ⏱️ Starting job execution timer...")
        start_time = time.time()
        
        try:
            # Step 1: Connect to source database
            print(f"   🔌 Step 1: Connecting to source database...")
            connection_string = self._build_connection_string(source_connection)
            print(f"   📡 Connection string: {connection_string[:50]}...")
            
            conn = pyodbc.connect(connection_string)
            cursor = conn.cursor()
            print(f"   ✅ Database connection established successfully")

            # Step 2: Execute the job query
            print(f"   🔍 Step 2: Executing job query...")
            print(f"   📝 Query: {job.job_query[:100]}...")
            
            cursor.execute(job.job_query)
            rows = cursor.fetchall()
            records_processed = len(rows)
            print(f"   📊 Query executed successfully. Records fetched: {records_processed}")

            # Step 3: Insert data into target table (same database for now)
            # This is a simplified version - you might want to customize this
            if records_processed > 0:
                print(f"   📥 Step 3: Inserting {records_processed} records into target table: {job.target_table}")
                self._insert_into_target(cursor, job.target_table, rows)
                print(f"   ✅ Data inserted into target table successfully")
            else:
                print(f"   ⚠️ No records to insert (records_processed = 0)")

            # Step 4: Calculate execution time and update status
            execution_time = time.time() - start_time
            print(f"   ⏱️ Execution completed in {execution_time:.2f} seconds")
            
            execution.status = 'completed'
            execution.execution_time_seconds = round(execution_time, 2)
            execution.records_processed = records_processed
            execution.completed_at = timezone.now()
            execution.execution_log = f"Successfully processed {records_processed} records in {execution_time:.2f} seconds"
            execution.save()
            print(f"   📝 Execution record updated with success status")

            cursor.close()
            conn.close()
            print(f"   🔌 Database connection closed")

            return {
                'job_id': job.id,
                'job_name': job.job_name,
                'status': 'completed',
                'records_processed': records_processed,
                'execution_time_seconds': round(execution_time, 2)
            }

        except Exception as e:
            execution_time = time.time() - start_time
            print(f"   ❌ Job execution failed after {execution_time:.2f} seconds")
            print(f"   🚨 Error details: {str(e)}")
            
            execution.status = 'failed'
            execution.execution_time_seconds = round(execution_time, 2)
            execution.error_message = str(e)
            execution.completed_at = timezone.now()
            execution.execution_log = f"Failed after {execution_time:.2f} seconds: {str(e)}"
            execution.save()
            print(f"   📝 Execution record updated with failure status")

            raise e

    def _build_connection_string(self, source_connection):
        """Build ODBC connection string for the source database"""
        if source_connection.db_type == 'sqlserver':
            return (
                f"DRIVER={{ODBC Driver 18 for SQL Server}};"
                f"SERVER={source_connection.host},{source_connection.port};"
                f"DATABASE=TestingDB19082025;"
                f"UID={source_connection.username};"
                f"PWD={source_connection.password};"
                f"Encrypt=yes;TrustServerCertificate=yes;"
            )
        else:
            # Add support for other database types as needed
            raise ValueError(f"Database type {source_connection.db_type} not yet supported")

    def _insert_into_target(self, cursor, target_table, rows):
        """
        Insert data into target table
        This is a simplified version - customize based on your needs
        """
        if not rows:
            return

        # Get column names from the first row
        columns = [column[0] for column in cursor.description]
        
        # Build INSERT statement
        placeholders = ','.join(['?' for _ in columns])
        insert_sql = f"INSERT INTO {target_table} ({','.join(columns)}) VALUES ({placeholders})"
        
        # Execute batch insert
        cursor.executemany(insert_sql, rows)
        cursor.commit()

    @action(detail=False, methods=['get'])
    def execution_history(self, request):
        """Get ETL execution history"""
        executions = JobExecution.objects.all().order_by('-executed_at')
        
        # Apply filters if provided
        source_id = request.query_params.get('source_id')
        job_id = request.query_params.get('job_id')
        status = request.query_params.get('status')
        
        if source_id:
            executions = executions.filter(job__source_id=source_id)
        if job_id:
            executions = executions.filter(job_id=job_id)
        if status:
            executions = executions.filter(status=status)

        page = self.paginate_queryset(executions)
        if page is not None:
            serializer = JobExecutionSummarySerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = JobExecutionSummarySerializer(executions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def job_status(self, request, pk=None):
        """Get status of a specific job execution"""
        try:
            execution = JobExecution.objects.get(id=pk)
            serializer = JobExecutionSerializer(execution)
            return Response(serializer.data)
        except JobExecution.DoesNotExist:
            return Response(
                {'error': 'Job execution not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
