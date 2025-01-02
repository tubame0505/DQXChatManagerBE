import { EmoteData } from './EmoteData';
import { LogManager } from './LogManager';
import { waitUntilListOpen, findElementsByXpath, waitUntilDialog, registerOrCancelAndDialogClear, setSelectOption } from './utils';
import { getOneEmote } from './export';
import { saveProgress, Progress } from './Progress';

export const importEmote = async (logManager: LogManager, progress: Progress, setIsProcessing: (value: boolean) => void) => {
    // 確認ダイアログ
    let max_retry = 5;
    let error_count = 0;
    if (!progress.getIsProcessing()) {
        const userConfirmed = window.confirm('本当に取り込みますか？今の設定は上書きされます');
        if (!userConfirmed) {
            progress.setLogText(logManager.addLog('取り込みキャンセル'));
            return;
        }
    } else {
        max_retry = progress.getMaxRetry();
        error_count = progress.getErrorCount();
    }

    // 取り込み開始
    let current_index = (progress.getIsProcessing()) ? progress.getIndex() : 0;
    const emote = progress.getEmoteText();
    const settings = emote.split("\r").join("").split("\n");
    const index_max = settings.length;
    setIsProcessing(true);
    progress.setProcessing(true);
    try {
        for (let i = current_index; i < index_max; i++) {
            let last_error: unknown = undefined;
            const setting = settings[i];
            while (max_retry > 0) {
                max_retry -= 1;
                progress.setMaxRetry(max_retry);
                progress.setIndex(i);
                saveProgress(progress);
                try {
                    if (setting.length > 0) {
                        await setEmote(setting, logManager, progress);
                    }
                    break;
                } catch (error) {
                    // 再読み込み
                    last_error = error;
                    // 5秒待機する
                    await new Promise((resolve) => setTimeout(resolve, 5000));
                    // 再読み込み
                    saveProgress(progress);
                    // ページリロード
                    window.location.reload();
                    return;
                }
            }
            if (max_retry <= 0) {
                progress.setLogText(logManager.addLog(`エラーが発生しました ${last_error}`));
                error_count += 1;
                progress.setErrorCount(error_count);
            }
            max_retry = 5;
            progress.setMaxRetry(max_retry);
        }
        if (error_count == 0) {
            progress.setLogText(logManager.addLog('正常に完了しました'));
        } else {
            progress.setLogText(logManager.addLog(`完了 (エラーが ${error_count}件ありました)`));
        }
        window.alert('取り込みが完了しました');
        setIsProcessing(false);
        progress.setProcessing(false);
    } catch (error) {
        progress.setLogText(logManager.addLog(`出力失敗: ${error}`));
    } finally {
        saveProgress(progress);
    }
};

const setEmote = async (setting: string, logManager: LogManager, progress: Progress) => {
    const emoteData = new EmoteData();
    /* parse */
    try {
        emoteData.emoteFromString(setting);
    } catch (error) {
        progress.setLogText(logManager.addLog(` ${setting} >処理中<`));
        progress.setLogText(logManager.addLog('設定を読み込めなかったのでスキップします'));
        return;
    }
    /* タイプチェック */
    if (
        emoteData.type != "セリフ" &&
        emoteData.type != "スタンプ" &&
        emoteData.type != "だいじなもの" &&
        emoteData.type != "その他"
    ) {
        progress.setLogText(logManager.addLog(` ${setting} >処理中<`));
        progress.setLogText(logManager.addLog('セリフ・スタンプ以外のためスキップします'));
        return;
    }

    /* リストが閉じていたら開く */
    const pageBar = `p1${emoteData.pageId.split("-")[2]}`;
    const listHolder = document.getElementById(pageBar);
    if (listHolder === undefined) {
        progress.setLogText(logManager.addLog('error0'));
        return;
    }
    const listHolderStyle = await listHolder?.getAttribute("class");
    if (listHolderStyle!.indexOf("hide") > 0) {
        listHolder!.click();
        await waitUntilListOpen(
            `//*[@id="${emoteData.pageId}"]/table/tbody/tr[${emoteData.index}]/td[3]/a`
        );
    }

    /* 変更する必要がなければスキップ */
    const currentEmote = await getOneEmote(emoteData.pageId, emoteData.index);
    if (currentEmote.emoteToString() === emoteData.emoteToString()) {
        //progress.setLogText(logManager.addLog('設定済みのためスキップします'));
        return;
    }

    /* 設定ダイアログ開く */
    const openLink = await findElementsByXpath(
        `//*[@id="${emoteData.pageId}"]/table/tbody/tr[${emoteData.index}]/td[3]/a`
    );
    if (openLink === undefined) {
        throw Error("ページ読み込みエラー <openLink>\r\n中断しました");
    }
    openLink[0].click();
    await waitUntilDialog();

    /* 設定 */
    progress.setLogText(logManager.addLog(` ${setting} >処理中<`));
    saveProgress(progress);
    if (emoteData.type === "セリフ") {
        await setDialogue(emoteData);
    } else if (emoteData.type === "スタンプ") {
        await setStamp(emoteData);
    } else {
        await setOthers(emoteData);
    }
}

const setDialogue = async (emoteData: EmoteData) => {
    /* ラジオボタン　→　セリフ */
    const rButton = await findElementsByXpath(
        '//*[@id="emotemsg-edit-modal"]/div/div/form/table[1]/tbody/tr[2]/td[3]/div[1]/label/input'
    )
    if (rButton === undefined) {
        throw Error("ページ読み込みエラー <rButton>\r\n中断しました");
    }
    await rButton[0].click();

    /* テキストエリア */
    const textArea = await findElementsByXpath(
        '//*[@id="emotemsg-edit-modal"]/div/div/form/table[1]/tbody/tr[2]/td[4]/textarea'
    )
    if (textArea === undefined) {
        throw Error("ページ読み込みエラー <textArea>\r\n中断しました");
    }
    const textAreaElement = textArea[0] as HTMLTextAreaElement;
    emoteData.contents == "（なし）" ? textAreaElement.value = "" : textAreaElement.value = emoteData.contentsToKey();

    /* しぐさ */
    await setSelectOption(
        '//*[@id="emotemsg-edit-modal"]/div/div/form/table[1]/tbody/tr[2]/td[5]/div[1]/select',
        emoteData.action
    )

    /* 表情 */
    await setSelectOption(
        '//*[@id="emotemsg-edit-modal"]/div/div/form/table[1]/tbody/tr[2]/td[6]/div[1]/select',
        emoteData.face
    )

    /* タイミング */
    await setSelectOption(
        '//*[@id="emotemsg-edit-modal"]/div/div/form/table[1]/tbody/tr[2]/td[7]/div[1]/select',
        emoteData.timing
    )

    /* 登録 */
    await registerOrCancelAndDialogClear(true);
}

const setStamp = async (emoteData: EmoteData) => {
    /* ラジオボタン　→　スタンプ */
    const rButton = await findElementsByXpath(
        '//*[@id="emotemsg-edit-modal"]/div/div/form/table[1]/tbody/tr[2]/td[3]/div[2]/label/input'
    )
    if (rButton === undefined) {
        throw Error("ページ読み込みエラー <rButton>\r\n中断しました");
    }
    await rButton[0].click();

    /* スタンプ */
    const openButton = await findElementsByXpath(
        '//*[@id="emotemsg-edit-modal"]/div/div/form/table[1]/tbody/tr[2]/td[4]/table/tbody/tr/td[2]/div'
    )
    if (openButton === undefined) {
        throw Error("ページ読み込みエラー <openButton>\r\n中断しました");
    }
    await openButton[0].click();
    const targetStampNo = emoteData.contents.split("_")[0];
    const stampButton = await findElementsByXpath(
        `//*[@id="emotemsg-edit-modal"]/div/div/form/table[1]/tbody/tr[2]/td[4]/table/tbody/tr/td[2]/div/div[2]//a[@data-value='${targetStampNo}']`
    )
    if (stampButton === undefined) {
        throw Error("ページ読み込みエラー <stampButton>\r\n中断しました");
    }
    await stampButton[0].click();

    /* しぐさ */
    await setSelectOption(
        '//*[@id="emotemsg-edit-modal"]/div/div/form/table[1]/tbody/tr[2]/td[5]/div[1]/select',
        emoteData.action
    )

    /* 表情 */
    await setSelectOption(
        '//*[@id="emotemsg-edit-modal"]/div/div/form/table[1]/tbody/tr[2]/td[6]/div[1]/select',
        emoteData.face
    )

    /* 登録 */
    await registerOrCancelAndDialogClear(true);
}

const setOthers = async (emoteData: EmoteData) => {
    /* ラジオボタン　→　だいじなもの or その他 */
    const radioButtonNum = emoteData.type === "だいじなもの" ? 3 : 4;
    const rButton = await findElementsByXpath(
        `//*[@id="emotemsg-edit-modal"]/div/div/form/table[1]/tbody/tr[2]/td[3]/div[${radioButtonNum}]/label/input`
    );
    if (rButton === undefined) {
        throw Error("ページ読み込みエラー <rButton>\r\n中断しました");
    }
    await rButton[0].click();

    /* だいじなもの or その他 */
    const selectElemNum = emoteData.type === "だいじなもの" ? 1 : 2;
    await setSelectOption(
        `//*[@id="emotemsg-edit-modal"]/div/div/form/table[1]/tbody/tr[2]/td[4]/div[${selectElemNum}]/select`,
        emoteData.contents
    )

    /* 登録 */
    await registerOrCancelAndDialogClear(true);
}
