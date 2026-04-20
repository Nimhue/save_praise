import * as vscode from 'vscode';

// praise messages 

const PRAISE: string[] = [
  'nice save (◠‿◠)',
  'looking good (｡◕‿◕｡)',
  'keep going ☆',
  'smooth (´• ω •`)',
  'wonderful *.+:｡.+*',
  'you got this (◕ᴗ◕✿)',
  'so clean (⌒‿⌒)',
  'lovely work ～☆',
  'doing great (´｡• ᵕ •｡`)',
  'saved with grace (◡‿◡)',
  'nice one (≧◡≦)',
  'beautiful ｡.:*☆',
  'keep it up (•̀ᴗ•́)و',
  'that was good (◕‿◕)',
  'perfect (◠‿◠)☆',
  'brilliant work (ノ◕ヮ◕)ノ',
  'well done ☆～',
  'sparkling (✧◡✧)',
  'tidy (◕ᴗ◕)',
  'chef\'s kiss ～☆',
];

// diff-aware commentary 

const BIG_ADD: string[] = [
  'you\'ve been busy (°o°)',
  'that\'s a lot of new code (◎_◎)',
  'someone\'s on a roll (ノ◕ヮ◕)ノ',
];

const BIG_DELETE: string[] = [
  'decluttering (◕ᴗ◕)',
  'less is more ～☆',
  'cleaning house (⌒‿⌒)',
];

const PURE_DELETE: string[] = [
  'satisfying cleanup (◡‿◡)',
  'deleting feels good (◕‿◕)',
];

const NO_CHANGE: string[] = [
  'just checking in? (◕ᴗ◕)',
  'nothing changed, still cute ☆',
  'save of confidence (◠‿◠)',
];

// state

let statusBarItem: vscode.StatusBarItem;
let hideTimeout: NodeJS.Timeout | undefined;
let decorationTimeout: NodeJS.Timeout | undefined;
let lastPraiseIndex = -1;
let activeDecorationType: vscode.TextEditorDecorationType | undefined;

// tracks accumulated +/- lines per file between saves
interface LineDiff { added: number; removed: number; }
const pendingDiffs = new Map<string, LineDiff>();

// helpers

function pick(arr: string[], avoidIndex?: number): [string, number] {
  let i: number;
  do {
    i = Math.floor(Math.random() * arr.length);
  } while (i === avoidIndex && arr.length > 1);
  return [arr[i], i];
}

function formatDiff(diff: LineDiff): string {
  const parts: string[] = [];
  if (diff.added > 0) { parts.push(`+${diff.added}`); }
  if (diff.removed > 0) { parts.push(`-${diff.removed}`); }
  if (parts.length === 0) { return ''; }
  return parts.join(' ');
}

function pickMessage(diff: LineDiff): string {
  const net = diff.added - diff.removed;
  const total = diff.added + diff.removed;

  // nothing changed
  if (total === 0) {
    return pick(NO_CHANGE)[0];
  }

  // big changes get special commentary
  if (diff.added >= 20 && net > 0) {
    return pick(BIG_ADD)[0];
  }
  if (diff.removed >= 20 && net < 0) {
    return pick(BIG_DELETE)[0];
  }
  if (diff.added === 0 && diff.removed > 0) {
    return pick(PURE_DELETE)[0];
  }

  // normal save — standard praise
  const [msg, idx] = pick(PRAISE, lastPraiseIndex);
  lastPraiseIndex = idx;
  return msg;
}

// core

function onDocumentChange(e: vscode.TextDocumentChangeEvent): void {
  const uri = e.document.uri.toString();
  let diff = pendingDiffs.get(uri);
  if (!diff) {
    diff = { added: 0, removed: 0 };
    pendingDiffs.set(uri, diff);
  }

  for (const change of e.contentChanges) {
    const linesRemoved = change.range.end.line - change.range.start.line;
    const linesAdded = (change.text.match(/\n/g) || []).length;

    diff.removed += linesRemoved;
    diff.added += linesAdded;
  }
}

function clearDecoration(): void {
  if (activeDecorationType) {
    activeDecorationType.dispose();
    activeDecorationType = undefined;
  }
  if (decorationTimeout) {
    clearTimeout(decorationTimeout);
    decorationTimeout = undefined;
  }
}

function showInlineDecoration(message: string, duration: number): void {
  clearDecoration();

  const editor = vscode.window.activeTextEditor;
  if (!editor) { return; }

  activeDecorationType = vscode.window.createTextEditorDecorationType({
    after: {
      contentText: `  ${message}`,
      color: new vscode.ThemeColor('editorLineNumber.foreground'),
      fontStyle: 'italic',
      margin: '0 0 0 2em',
    },
    isWholeLine: true,
  });

  const cursorLine = editor.selection.active.line;
  const range = new vscode.Range(cursorLine, 0, cursorLine, 0);
  editor.setDecorations(activeDecorationType, [range]);

  decorationTimeout = setTimeout(() => {
    clearDecoration();
  }, duration);
}

function showPraise(doc: vscode.TextDocument): void {
  const config = vscode.workspace.getConfiguration('savePraise');
  if (!config.get<boolean>('enabled', true)) {
    return;
  }

  const duration = config.get<number>('duration', 3000);
  const uri = doc.uri.toString();
  const diff = pendingDiffs.get(uri) || { added: 0, removed: 0 };

  // build status text
  const diffStr = formatDiff(diff);
  const message = pickMessage(diff);
  const fullText = diffStr ? `${diffStr} ${message}` : message;

  // reset diff tracking for this file
  pendingDiffs.set(uri, { added: 0, removed: 0 });

  // status bar with highlight
  statusBarItem.text = `$(heart) ${fullText}`;
  statusBarItem.backgroundColor = new vscode.ThemeColor(
    'statusBarItem.warningBackground'
  );
  statusBarItem.show();

  if (hideTimeout) {
    clearTimeout(hideTimeout);
  }
  hideTimeout = setTimeout(() => {
    statusBarItem.hide();
  }, duration);

  // inline editor decoration
  showInlineDecoration(fullText, duration);
}

// lifecycle

export function activate(context: vscode.ExtensionContext): void {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    0
  );
  statusBarItem.tooltip = 'Save Praise (◠‿◠)';

  const onChange = vscode.workspace.onDidChangeTextDocument(onDocumentChange);

  const onSave = vscode.workspace.onDidSaveTextDocument((doc) => {
    showPraise(doc);
  });

  const toggleCmd = vscode.commands.registerCommand('savePraise.toggle', () => {
    const config = vscode.workspace.getConfiguration('savePraise');
    const current = config.get<boolean>('enabled', true);
    config.update('enabled', !current, vscode.ConfigurationTarget.Global);
    if (current) {
      statusBarItem.hide();
    }
    vscode.window.showInformationMessage(
      current ? 'Save Praise off (︶.︶)' : 'Save Praise on (◕‿◕)!'
    );
  });

  context.subscriptions.push(statusBarItem, onChange, onSave, toggleCmd);
}

export function deactivate(): void {
  if (hideTimeout) {
    clearTimeout(hideTimeout);
  }
  clearDecoration();
  pendingDiffs.clear();
}