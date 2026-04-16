from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from app.core.config import settings


def configure_tracing() -> None:
    provider = TracerProvider()
    exporter = OTLPSpanExporter(endpoint=settings.otel_exporter_otlp_endpoint, insecure=True)
    processor = BatchSpanProcessor(exporter)
    provider.add_span_processor(processor)
    trace.set_tracer_provider(provider)
