from prometheus_client import Counter, Histogram, Gauge

WORKFLOW_TOTAL = Counter("total_workflows_executed", "Total workflows created")
FAILED_JOBS_TOTAL = Counter("failed_jobs_total", "Total failed jobs")
PROCESSING_TIME_SECONDS = Histogram("average_processing_time_seconds", "Workflow processing time")
QUEUE_DEPTH = Gauge("queue_depth", "Queue depth estimate", ["queue"])
ACTIVE_WORKER_COUNT = Gauge("active_worker_count", "Active worker count", ["worker"])
