import { expect, test } from "bun:test";
import {
  history,
  redo,
  redoDepth,
  undo,
  undoDepth,
} from "@codemirror/commands";
import { EditorState, Transaction } from "@codemirror/state";
import { ExternalChange } from "@uiw/react-codemirror";
import { isolateExternalHistory } from "../src/lib/editorHistory";

test("rapid visual edits undo independently from each other and surrounding typing", () => {
  const versions = [
    "flowchart TD\n A[Start]",
    "flowchart TD\n A[Start]\n A --> B[End]",
    "flowchart TD\n A[Start]\n A --> B[Finish]",
    "flowchart LR\n A[Start]\n A --> B[Finish]",
    "flowchart LR\n A[Start]\n A --> B[Finish]\n B --> C",
  ];
  let state = EditorState.create({
    doc: versions[0],
    extensions: [history(), isolateExternalHistory],
  });
  const dispatch = (transaction: Transaction) => {
    state = transaction.state;
  };

  expect(undoDepth(state)).toBe(0);
  for (let index = 1; index < versions.length; index++) {
    state = state.update({
      changes: { from: 0, to: state.doc.length, insert: versions[index] },
      annotations: [
        Transaction.time.of(1000 + index),
        ...(index === 2 || index === 3
          ? [ExternalChange.of(true)]
          : [Transaction.userEvent.of("input.type")]),
      ],
    }).state;
  }
  expect(undoDepth(state)).toBe(4);

  for (const previous of versions.slice(0, -1).reverse()) {
    expect(undo({ state, dispatch })).toBe(true);
    expect(state.doc.toString()).toBe(previous);
  }
  expect(undoDepth(state)).toBe(0);
  expect(redoDepth(state)).toBe(4);

  for (const next of versions.slice(1)) {
    expect(redo({ state, dispatch })).toBe(true);
    expect(state.doc.toString()).toBe(next);
  }
  expect(redoDepth(state)).toBe(0);
});
