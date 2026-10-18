import { isolateHistory } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import { ExternalChange } from "@uiw/react-codemirror";

export const isolateExternalHistory = EditorState.transactionExtender.of(
  (transaction) =>
    transaction.annotation(ExternalChange)
      ? { annotations: isolateHistory.of("full") }
      : null,
);
