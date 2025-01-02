import { createSignal, createEffect, onMount } from 'solid-js';
import type { Component } from 'solid-js';
import styles from './App.module.css';
import { exportEmote, downloadText } from './export';
import { importEmote } from './import';
import { LogManager } from './LogManager';
import { Progress, loadProgress } from './Progress';

const App: Component = () => {
  const [isProcessing, setIsProcessing] = createSignal(false); // 実行中かどうかの状態
  const [text, setText] = createSignal('');
  const [logText, setLogText] = createSignal('起動しました');

  let logTextareaRef: HTMLTextAreaElement | undefined;
  let progress: Progress | undefined;
  const logManager = new LogManager(() => logText(), setLogText);

  onMount(() => {
    const savedProgress = loadProgress();
    if (savedProgress) {
      setLogText(savedProgress.getLogText());
      setText(savedProgress.getEmoteText());
      // 必要に応じて処理を再開する
      if (savedProgress.getIsProcessing()) {
        importEmote(logManager, savedProgress, setIsProcessing);
      }
    }
  });

  const handleInputChange = (event: Event) => {
    const inputElement = event.target as HTMLInputElement;
    setText(inputElement.value);
  };

  const handleFileUpload = (event: Event) => {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files?.[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileContent = e.target?.result as string;
        setText(fileContent);
      };
      reader.readAsText(file);
    }
  };

  // logText が変更されたらスクロールを一番下に移動
  createEffect(() => {
    logText(); // logTextの変更を監視
    if (logTextareaRef) {
      logTextareaRef.scrollTop = logTextareaRef.scrollHeight;
    }
  });

  return (
    <div class={styles.App}>
      <header class={styles.header}>
        <h1 class={styles.title}>DQX Chat Manager BE (0.1.0)</h1>

        <textarea
          value={text()}
          onInput={handleInputChange}
          rows={10}
          class={styles.textarea}
        />

        <div style={{ height: '10px' }}></div>

        <textarea
            ref={logTextareaRef} // 参照を取得
          value={logText()}
          rows={4}
          class={styles.textarea}
          readonly={true}
        />

        <div class={styles.buttonContainer}>
          <button
            class={styles.button}
            onClick={() => {
              logManager.clearLog();
              exportEmote(logManager, setText, setIsProcessing)
            }}
            disabled={isProcessing()}
          >
            設定を出力
          </button>

          <button
            class={`${styles.button} ${styles.danger}`}
            onClick={() => {
              logManager.clearLog();
              if (progress === undefined) {
                progress = new Progress();
              }
              progress.setEmoteText(text());
              importEmote(logManager, progress, setIsProcessing);
            }}
            disabled={isProcessing() || text() === ''}
          >
            設定を取り込む
          </button>

          <div class={styles.buttonGroup}>
            <button
              class={styles.button}
              onClick={() => downloadText(text())}
              disabled={isProcessing() || text() === ''}
            >
              ダウンロード
            </button>

            <label class={styles.fileInputLabel}>
              ファイルから読み込み
              <input
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                class={styles.fileInput}
              />
            </label>
          </div>
        </div>
      </header>
    </div>
  );
};

export default App;
