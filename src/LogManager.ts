export class LogManager {
    private getLogText: () => string;
    private setLogText: (text: string) => void;

    constructor(getLogText: () => string, setLogText: (text: string) => void) {
      // 初期化時に関数を受け取る
      this.getLogText = getLogText;
      this.setLogText = setLogText;
    }

    addLog(message: string): string {
      // 現在のログテキストを取得
      const text = this.getLogText();

      // テキストを行ごとに分割
      const lines = text.split('\n');

      // 行数が200行以上の場合、最初の行を削除
      if (lines.length >= 200) {
        lines.shift();
      }

      // 最後のメッセージと同じでない場合のみ追加
      if (lines.length === 0 || lines[lines.length - 1] !== message) {
        lines.push(message);
      }

      // 更新されたテキストを状態に反映
      const newText = lines.join('\n');
      this.setLogText(newText);

      return newText;
    }

    clearLog(): string {
      const newText = '';
      this.setLogText(newText);
      return newText;
    }
}
