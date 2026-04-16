from app.events.workflow_observer import WorkflowObserver

observer_singleton = WorkflowObserver()


def register_default_listeners() -> None:
    observer_singleton.subscribe(
        "workflow.created",
        lambda payload: print(f"[observer] workflow.created => {payload}"),
    )
