import { EmoteData } from './EmoteData';
import { LogManager } from './LogManager';
import { findElementsByXpath, waitUntilListOpen } from './utils';

export const exportEmote = async (logManager: LogManager, setText: (text: string) => void, setIsProcessing: (value: boolean) => void) => {
    setIsProcessing(true);
    logManager.addLog('出力開始');
    let emoteText = '';
    setText(emoteText);

    try {
        for (let i = 0; i < 10; i++) {
            logManager.addLog(`${i + 1}ページ目出力中`);
            const pageId = `emote-list-${i}`;
            emoteText = await getEmotePage(pageId, logManager, setText, emoteText) || '';
        }
    } catch (error) {
        logManager.addLog(`出力失敗: ${error}`);
    }
    logManager.addLog('出力完了');
    setIsProcessing(false);
};

export const downloadText = (text: string) => {
    // 現在のタイムスタンプを「YYYYMMDD_HHMMSS」の形式にする
    const now = new Date();

    // 各部分をゼロ埋めして2桁にする
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');  // 月は0ベースなので+1
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    // フォーマットを作成
    const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`;

    // ファイル名を設定
    const fileName = `DQXChat_${timestamp}.txt`;

    // Blobを使ってテキストデータをファイルに変換
    const blob = new Blob([text], { type: 'text/plain' });

    // ダウンロード用のリンクを作成
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);  // BlobをURLとして生成
    link.download = fileName;  // ダウンロードするファイル名を設定

    // リンクをクリックしてファイルをダウンロード
    link.click();

    // URLを開放
    URL.revokeObjectURL(link.href);
};

export const addEmote = (message: string, text: string, setText: (text: string) => void) => {
    const newText = text + message + '\n';
    setText(newText);
    return newText;
};

export const getEmotePage = async (pageId: string, logManager: LogManager, setText: (text: string) => void, text: string) => {
    /* リストが閉じていたら開く */
    const pageBar = `p1${pageId.split("-")[2]}`;
    const listHolder = document.getElementById(pageBar);
    if (listHolder === undefined) {
        logManager.addLog("error0");
        return;
    }
    const listHolderStyle = await listHolder?.getAttribute("class");
    if (listHolderStyle!.indexOf("hide") > 0) {
        listHolder!.click();
        await waitUntilListOpen(
            `//*[@id="${pageId}"]/table/tbody/tr[1]/td[3]/a`
        );
    }
    /* 読み込み */
    for (let i = 0; i < 10; i++) {
        const emoteData = await getOneEmote(pageId, i + 1);
        text = addEmote(emoteData.emoteToString(), text, setText);
    }

    return text;
};

export const getOneEmote = async (pageId: string, index: number) => {
    const emoteData = new EmoteData();
    emoteData.pageId = pageId;
    emoteData.index = index;
    const attrs = await findElementsByXpath(
        `//*[@id="${pageId}"]/table/tbody/tr[${index}]/td`
    );
    if (attrs && attrs.length < 6) {
        throw Error(`ページ読み込みエラー <element not found>`);
    }
    const typeElement = attrs[1];
    const contentsElement = attrs[2];
    const actionElement = attrs[3];
    const faceElement = attrs[4];
    const timingElement = attrs[5];
    emoteData.type = await typeElement.innerText || "";
    if (emoteData.type === "セリフ") {
        const _contentsElement = await findElementsByXpath(
            "./a/span",
            contentsElement
        );
        let contents = _contentsElement[0].innerHTML || "";
        contents = contents
        .split("\r")
        .join("")
        .split("\n")
        .join("")
        .split("\t")
        .join("");
        emoteData.contents = contents;
    } else if (emoteData.type === "スタンプ") {
        const _contentsElement = await findElementsByXpath(
            "./a/span/img",
            contentsElement
        );
        const contents = _contentsElement[0].getAttribute("src") || "";
        const stampNo = contents.split("/")[6].split("_")[0];
        const stampName = await contentsElement.innerText || "";
        emoteData.contents = `${stampNo}_${stampName}`;
    } else {
        emoteData.contents = await contentsElement.innerText || "";
    }
    emoteData.action = await actionElement.innerText || "";
    emoteData.face = await faceElement.innerText || "";
    emoteData.timing = await timingElement.innerText || "";
    return emoteData;
};

