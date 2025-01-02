export class Progress {
    private isProcessing: boolean;
    private logText: string;
    private emoteText: string;
    private index: number;
    private maxRetry: number;
    private errorCount: number;

    constructor(
      isProcessing: boolean = false,
      logText: string = "",
      emoteText: string = "",
      index: number = 0,
      maxRetry: number = 5,
      errorCount: number = 0
    )
    {
      this.isProcessing = isProcessing;
      this.logText = logText;
      this.emoteText = emoteText;
      this.index = index;
      this.maxRetry = maxRetry;
      this.errorCount = errorCount;
    }

    setProcessing(isProcessing: boolean) {
      this.isProcessing = isProcessing;
    }

    setLogText(logText: string) {
      this.logText = logText;
    }

    setEmoteText(emoteText: string) {
      this.emoteText = emoteText;
    }

    setIndex(index: number) {
      this.index = index;
    }

    setMaxRetry(maxRetry: number) {
      this.maxRetry = maxRetry;
    }

    setErrorCount(errorCount: number) {
      this.errorCount = errorCount;
    }

    getLogText() {
      return this.logText;
    }

    getEmoteText() {
      return this.emoteText;
    }

    getIsProcessing() {
      return this.isProcessing;
    }

    getIndex() {
      return this.index;
    }

    getMaxRetry() {
      return this.maxRetry;
    }

    getErrorCount() {
      return this.errorCount;
    }
}


// 状態をセッションストレージに保存する
export const saveProgress = (progress: Progress) => {
    sessionStorage.setItem('progressData', JSON.stringify(progress));
};

// セッションストレージから進行状況を読み込む
export const loadProgress = () => {
    const progressData = sessionStorage.getItem('progressData');

    if (progressData) {
        const jobj = JSON.parse(progressData);
        const progress = new Progress(
          jobj.isProcessing,
          jobj.logText,
          jobj.emoteText,
          jobj.index,
          jobj.maxRetry,
          jobj.errorCount
        );
        return progress;
    }
    return null;
};
