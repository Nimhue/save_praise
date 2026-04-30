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
  'neat (◕‿◕)☆',
  'crisp (⌒‿⌒)☆',
  'on point (◕ᴗ◕)',
  'solid work ～☆',
  'looking sharp (◠‿◠)',
  'quality save (◕‿◕)',
  'elegant (✧◡✧)☆',
  'precision (◕ᴗ◕✿)',
  'flawless *.+:｡.+*',
  'polished (⌒‿⌒)',
  'impressive (｡◕‿◕｡)',
  'love it (◡‿◡)☆',
  'superb ～☆',
  'masterful (◕ᴗ◕)',
  'pristine (✧◡✧)',
  'delightful (´｡• ᵕ •｡`)',
  'glowing ☆～',
  'adorable save (◕ᴗ◕✿)',
  'top notch (≧◡≦)',
  'pure magic *.+:｡.+*',
  'excellence (◠‿◠)☆',
  'golden (⌒‿⌒)☆',
];

// diff-aware commentary

const BIG_ADD: string[] = [
  'you\'ve been busy (°o°)',
  'that\'s a lot of new code (◎_◎)',
  'someone\'s on a roll (ノ◕ヮ◕)ノ',
  'writing spree (°o°)☆',
  'the code is flowing (◕ᴗ◕)',
  'so much new stuff (◎_◎)',
  'productive burst (ノ◕ヮ◕)ノ',
];

const BIG_DELETE: string[] = [
  'decluttering (◕ᴗ◕)',
  'less is more ～☆',
  'cleaning house (⌒‿⌒)',
  'trimming the garden (◕ᴗ◕✿)',
  'making space (◡‿◡)',
  'simplified (✧◡✧)',
];

const PURE_DELETE: string[] = [
  'satisfying cleanup (◡‿◡)',
  'deleting feels good (◕‿◕)',
  'out with the old (⌒‿⌒)',
  'farewell, old code ～☆',
  'lighter already (◕ᴗ◕)',
];

const NO_CHANGE: string[] = [
  'just checking in? (◕ᴗ◕)',
  'nothing changed, still cute ☆',
  'save of confidence (◠‿◠)',
  'safety save (◕‿◕)',
  'trust the process ～☆',
];

const MODIFIED: string[] = [
  'fine-tuning (⌒‿⌒)',
  'tweaking (◕ᴗ◕)',
  'polishing (◡‿◡)☆',
  'little adjustments ～☆',
  'touch-ups (◕‿◕)',
  'refining (✧◡✧)',
  'small but mighty (•̀ᴗ•́)و',
  'detail work (◕ᴗ◕✿)',
  'subtle changes (⌒‿⌒)☆',
  'precision edits (◠‿◠)',
];

// rare messages (2% chance)

const RARE: string[] = [
  'legendary save (ノ◕ヮ◕)ノ*.+:｡☆',
  'you are the chosen one (✧◡✧)*.+:｡',
  'a save worthy of legends ☆～*.+:｡',
  'the code gods smile upon you (◕ᴗ◕)☆',
  'mythical save unlocked *.+:｡.+*☆',
  'once in a lifetime save (≧◡≦)☆',
  'save of the century (ノ◕ヮ◕)ノ☆',
  'the stars aligned for this one *.+:｡☆',
];

// time-aware messages

const TIME_EARLY: string[] = [
  'early bird (◕ᴗ◕)☆',
  'up and coding (⌒‿⌒)',
  'morning dedication ～☆',
  'sunrise coder (✧◡✧)',
];

const TIME_LATE: string[] = [
  'still here? respect (◕‿◕)',
  'night owl (◕ᴗ◕)☆',
  'burning the midnight oil ～☆',
  'the moon appreciates you (◡‿◡)',
  'late night magic (✧◡✧)',
];

const TIME_LUNCH: string[] = [
  'lunchtime save, smart (◠‿◠)',
  'saving before food (◕ᴗ◕)',
  'hungry but productive ～☆',
];

const TIME_FRIDAY_PM: string[] = [
  'almost weekend (◡‿◡)',
  'friday vibes (◕ᴗ◕)☆',
  'one more save and relax ～☆',
  'weekend is calling (✧◡✧)',
];

// state

let statusBarItem: vscode.StatusBarItem;
let hideTimeout: NodeJS.Timeout | undefined;
let decorationTimeout: NodeJS.Timeout | undefined;
let lastPraiseIndex = -1;
let activeDecorationType: vscode.TextEditorDecorationType | undefined;

interface LineDiff { added: number; removed: number; modified: number; }
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
  if (diff.modified > 0 && diff.added === 0 && diff.removed === 0) {
    parts.push(`~${diff.modified}`);
  }
  if (parts.length === 0) { return ''; }
  return parts.join(' ');
}

function getTimePool(): string[] | null {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();

  if (day === 5 && hour >= 14) { return TIME_FRIDAY_PM; }
  if (hour >= 23 || hour < 5) { return TIME_LATE; }
  if (hour >= 5 && hour < 8) { return TIME_EARLY; }
  if (hour >= 12 && hour <= 13) { return TIME_LUNCH; }

  return null;
}

type MessageContext =
  | 'normal' | 'big_add' | 'big_delete' | 'pure_delete'
  | 'no_change' | 'modified' | 'rare' | 'time';

function pickMessage(diff: LineDiff): [string, MessageContext] {
  const total = diff.added + diff.removed + diff.modified;

  // nothing changed at all
  if (total === 0) {
    return [pick(NO_CHANGE)[0], 'no_change'];
  }

  // 2% chance of rare message
  if (Math.random() < 0.02) {
    return [pick(RARE)[0], 'rare'];
  }

  // 15% chance of time-aware message
  const timePool = getTimePool();
  if (timePool && Math.random() < 0.15) {
    return [pick(timePool)[0], 'time'];
  }

  const net = diff.added - diff.removed;

  // big changes
  if (diff.added >= 20 && net > 0) {
    return [pick(BIG_ADD)[0], 'big_add'];
  }
  if (diff.removed >= 20 && net < 0) {
    return [pick(BIG_DELETE)[0], 'big_delete'];
  }

  // pure deletion
  if (diff.added === 0 && diff.modified === 0 && diff.removed > 0) {
    return [pick(PURE_DELETE)[0], 'pure_delete'];
  }

  // only in-line modifications
  if (diff.added === 0 && diff.removed === 0 && diff.modified > 0) {
    return [pick(MODIFIED)[0], 'modified'];
  }

  // normal save
  const [msg, idx] = pick(PRAISE, lastPraiseIndex);
  lastPraiseIndex = idx;
  return [msg, 'normal'];
}

function getStatusBarColor(context: MessageContext): vscode.ThemeColor {
  switch (context) {
    case 'rare':
      return new vscode.ThemeColor('statusBarItem.errorBackground');
    case 'big_add':
      return new vscode.ThemeColor('statusBarItem.warningBackground');
    case 'big_delete':
    case 'pure_delete':
      return new vscode.ThemeColor('statusBarItem.prominentBackground');
    case 'modified':
      return new vscode.ThemeColor('statusBarItem.warningBackground');
    case 'time':
      return new vscode.ThemeColor('statusBarItem.prominentBackground');
    case 'no_change':
      return new vscode.ThemeColor('statusBarItem.warningBackground');
    default:
      return new vscode.ThemeColor('statusBarItem.warningBackground');
  }
}

function getStatusBarIcon(context: MessageContext): string {
  switch (context) {
    case 'rare':        return '$(star-full)';
    case 'big_add':     return '$(rocket)';
    case 'big_delete':  return '$(trash)';
    case 'pure_delete': return '$(trash)';
    case 'modified':    return '$(pencil)';
    case 'time':        return '$(clock)';
    case 'no_change':   return '$(check)';
    default:            return '$(heart)';
  }
}

// core

function onDocumentChange(e: vscode.TextDocumentChangeEvent): void {
  const uri = e.document.uri.toString();
  let diff = pendingDiffs.get(uri);
  if (!diff) {
    diff = { added: 0, removed: 0, modified: 0 };
    pendingDiffs.set(uri, diff);
  }

  for (const change of e.contentChanges) {
    const linesRemoved = change.range.end.line - change.range.start.line;
    const linesAdded = (change.text.match(/\n/g) || []).length;

    if (linesRemoved === 0 && linesAdded === 0) {
      // content changed but no lines added/removed
      diff.modified++;
    } else {
      diff.removed += linesRemoved;
      diff.added += linesAdded;
    }
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
  const diff = pendingDiffs.get(uri) || { added: 0, removed: 0, modified: 0 };

  // build status text
  const diffStr = formatDiff(diff);
  const [message, context] = pickMessage(diff);
  const fullText = diffStr ? `${diffStr} ${message}` : message;

  // reset diff tracking for this file
  pendingDiffs.set(uri, { added: 0, removed: 0, modified: 0 });

  // status bar with context-aware color + icon
  const icon = getStatusBarIcon(context);
  statusBarItem.text = `${icon} ${fullText}`;
  statusBarItem.backgroundColor = getStatusBarColor(context);
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
