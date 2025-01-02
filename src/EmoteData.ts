export class EmoteData {
    pageId: string = "";
    index: number = -1;
    type: string = "";
    contents: string = "";
    action: string = "";
    face: string = "";
    timing: string = "";
  
    emoteToString(): string {
        const settings = `${this.pageId}\t${this.index}\t${this.type}\t${this.contents}\t${this.action}\t${this.face}\t${this.timing}`;
        return settings;
    }
  
    emoteFromString(settings: string) {
        const u = settings.split("\t");
        if (u.length != 7) {
            throw Error(`parse error`);
        }
        this.pageId = u[0];
        this.index = Number(u[1]);
        this.type = u[2];
        this.contents = u[3];
        this.action = u[4];
        this.face = u[5];
        this.timing = u[6];
    }
  
    contentsToKey(): string {
        return this.contents
            .split("&nbsp;")
            .join(" ")
            .split("&amp;")
            .join("&")
            .split("&lt;")
            .join("<")
            .split("&gt;")
            .join(">")
            .split("<br>")
            .join("\r\n");
    }
}
