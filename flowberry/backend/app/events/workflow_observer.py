from collections import defaultdict
from collections.abc import Callable


class WorkflowObserver:
    def __init__(self) -> None:
        self._listeners: dict[str, list[Callable[[dict], None]]] = defaultdict(list)

    def subscribe(self, event_name: str, callback: Callable[[dict], None]) -> None:
        self._listeners[event_name].append(callback)

    def notify(self, event_name: str, payload: dict) -> None:
        for callback in self._listeners[event_name]:
            callback(payload)
