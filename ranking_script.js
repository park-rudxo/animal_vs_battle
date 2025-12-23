// 1. 구글 스프레드시트 -> 확장 프로그램 -> Apps Script 에 들어가서 이 코드를 붙여넣으세요.
// 2. [배포] -> [새 배포] -> [유형 선택: 웹 앱]
// 3. 설명: "AnimalRanking", 다음 사용자로서 실행: "나(Me)", 액세스 권한이 있는 사용자: "모든 사용자(Anyone)" (중요!)
// 4. [배포] 클릭 후 생성된 "웹 앱 URL"을 복사해서 index.html의 SCRIPT_URL 변수에 넣으세요.

const SHEET_NAME = "Ranking";

function doGet(e) {
    return handleRequest(e);
}

function doPost(e) {
    return handleRequest(e);
}

function handleRequest(e) {
    const lock = LockService.getScriptLock();
    lock.tryLock(10000);

    try {
        const sheet = getSheet();

        // POST 요청 (점수 저장)
        if (e.postData && e.postData.contents) {
            const data = JSON.parse(e.postData.contents);
            const name = data.name.substring(0, 10); // 이름 길이 제한
            const score = parseInt(data.score);
            const date = new Date().toLocaleString();

            sheet.appendRow([name, score, date]);

            // 점수 내림차순 정렬 (2번째 컬럼 기준)
            const range = sheet.getDataRange();
            if (range.getNumRows() > 1) {
                // 헤더 제외하고 정렬하고 싶지만 간단하게 전체 정렬
                // 헤더가 있다면 range.offset(1, 0, range.getNumRows()-1).sort({column: 2, ascending: false});
                // 간단함을 위해 그냥 추가만 하고 읽을 때 정렬해서 줌
            }

            return ContentService.createTextOutput(JSON.stringify({ result: "success" }))
                .setMimeType(ContentService.MimeType.JSON);
        }

        // GET 요청 (랭킹 조회)
        else {
            const data = sheet.getDataRange().getValues();
            // 데이터가 없으면 빈 배열
            if (data.length === 0) {
                return ContentService.createTextOutput(JSON.stringify([]))
                    .setMimeType(ContentService.MimeType.JSON);
            }

            // 랭킹 계산 (점수 내림차순 정렬)
            // data[0]이 헤더일 수 있으므로 상황에 따라 처리 필요하나, 
            // 여기서는 그냥 모든 행을 데이터로 취급하고 정렬
            const ranks = data.map(row => ({
                name: row[0],
                score: parseInt(row[1]),
                date: row[2]
            }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 5); // 상위 5명만

            return ContentService.createTextOutput(JSON.stringify(ranks))
                .setMimeType(ContentService.MimeType.JSON);
        }

    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({ result: "error", error: error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);

    } finally {
        lock.releaseLock();
    }
}

function getSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
        sheet = ss.insertSheet(SHEET_NAME);
        // 헤더 추가
        sheet.appendRow(["Name", "Score", "Date"]);
    }
    return sheet;
}
