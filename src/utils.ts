export const findElementsByXpath = async (
  xpath: string,
  contextElement: HTMLElement | null = null
): Promise<HTMLElement[]> => {
  const result: HTMLElement[] = [];
  const nodesSnapshot = document.evaluate(
    xpath,
    contextElement || document,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  );

  for (let i = 0; i < nodesSnapshot.snapshotLength; i++) {
    const node = nodesSnapshot.snapshotItem(i) as HTMLElement;
    if (node) {
      result.push(node);
    }
  }

  return result;
};

export const getElementByXpath = async (xpath: string) => {
  const element = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  ).singleNodeValue as HTMLElement | null;
  return element;
};

export const waitUntilListOpen = async (xpath: string, timeout: number = 5000) => {
  const start = Date.now();

  while (true) {
    const element = await getElementByXpath(xpath);

    if (element) {
      const style = window.getComputedStyle(element);

      if (style.visibility !== "hidden" && style.display !== "none" && element.offsetHeight > 0) {
        return element;
      }
    }

    if (Date.now() - start > timeout) {
      throw new Error(`Timeout: Element matching XPath "${xpath}" did not become visible within ${timeout}ms.`);
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }
};

export const waitUntilDialog = async (timeout: number = 5000) => {
  const startTime = Date.now();

  while (true) {
    const element = document.querySelector('form[name="preferenceActionForm"]') as HTMLFormElement | null;
    if (element) {
      const style = window.getComputedStyle(element);

      // 要素が表示状態になった場合
      if (style.visibility !== 'hidden' && style.display !== 'none' && element.offsetHeight > 0) {
        return element; // 表示されている要素を返す
      }
    }

    // タイムアウトチェック
    if (Date.now() - startTime > timeout) {
      throw new Error(`Timeout: Form with name 'preferenceActionForm' did not become visible within ${timeout}ms.`);
    }

    // 次のチェックまで待機 (100ms 間隔)
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
};

export const waitUntilDialogDisappears = async (timeout: number = 5000) => {
  const startTime = Date.now();

  while (true) {
    const element = document.getElementById('_mdlg_dlg');

    // 要素が存在しないか、非表示なら終了
    if (!element || element.style.display === 'none' || element.style.visibility === 'hidden') {
      return;
    }

    // タイムアウト処理
    if (Date.now() - startTime > timeout) {
      throw new Error(`Timeout: Element with ID '_mdlg_dlg' did not disappear within ${timeout}ms.`);
    }

    // 次のチェックまで待機 (100ms 間隔)
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
};

export const registerOrCancelAndDialogClear = async (isRegister: boolean) => {
  let max_retry = 5;
  let last_error: unknown = undefined;
  while (max_retry > 0) {
    max_retry -= 1;
    const buttonNumber = isRegister ? 3 : 1;
    const registerOrCancelButton = await findElementsByXpath(
      `//*[@id="emotemsg-edit-modal"]/div/div/form/table[2]/tbody/tr/td[${buttonNumber}]/p/a`
    )
    if (registerOrCancelButton === undefined) {
      return;
    }
    // 少し待機してからボタンクリック
    await new Promise((resolve) => setTimeout(resolve, 500));
    registerOrCancelButton[0].click();

    try {
      await waitUntilDialogDisappears();
      return;
    } catch (error) {
      last_error = error;
    }
  }
  throw last_error;
}

export const setSelectOption = async(
  selectXpath: string,
  optionText: string
) => {
  const selectElements = await findElementsByXpath(selectXpath);
  if (!selectElements || selectElements.length === 0) {
    throw new Error(`ページ読み込みエラー <select>: ${selectXpath}\r\n中断しました`);
  }
  const selectElement = selectElements[0] as HTMLSelectElement;

  // 対応する <option> を検索
  const options = selectElement.querySelectorAll("option");
  let found = false;
  options.forEach((option) => {
    if (option.textContent?.trim() === optionText.trim()) {
      option.selected = true; // 選択する
      found = true;
    }
  });

  if (!found) {
    throw new Error(`オプションが見つかりませんでした: "${optionText}"`);
  }

  // change イベントを発火して変更を反映
  selectElement.dispatchEvent(new Event("change"));
};
