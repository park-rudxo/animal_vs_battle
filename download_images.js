const fs = require('fs');
const https = require('https');
const path = require('path');

const animals = [
    { id: 1, name: "아프리카 코끼리", enName: "african elephant" },
    { id: 2, name: "사자", enName: "lion" },
    { id: 3, name: "시베리아 호랑이", enName: "siberian tiger" },
    { id: 4, name: "하마", enName: "hippopotamus" },
    { id: 5, name: "코뿔소", enName: "rhinoceros" },
    { id: 6, name: "북극곰", enName: "polar bear" },
    { id: 7, name: "회색 곰 (그리즐리)", enName: "grizzly bear" },
    { id: 8, name: "나일 악어", enName: "nile crocodile" },
    { id: 9, name: "벌꿀오소리", enName: "honey badger" },
    { id: 10, name: "치타", enName: "cheetah" },
    { id: 11, name: "늑대", enName: "grey wolf" },
    { id: 12, name: "고릴라", enName: "silverback gorilla" },
    { id: 13, name: "하이에나", enName: "spotted hyena" },
    { id: 14, name: "표범", enName: "leopard" },
    { id: 15, name: "독수리", enName: "golden eagle" },
    { id: 16, name: "킹코브라", enName: "king cobra" },
    { id: 17, name: "기린", enName: "giraffe" },
    { id: 18, name: "캥거루", enName: "kangaroo" },
    { id: 19, name: "카피바라", enName: "capybara" },
    { id: 20, name: "멧돼지", enName: "wild boar" },
    { id: 21, name: "코모도 왕도마뱀", enName: "komodo dragon" },
    { id: 22, name: "재규어", enName: "jaguar animal" }
];

const dir = './images';
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}

const download = (url, dest, cb) => {
    https.get(url, (response) => {
        // Redirection handling
        if (response.statusCode === 301 || response.statusCode === 302) {
            return download(response.headers.location, dest, cb);
        }

        const file = fs.createWriteStream(dest);
        response.pipe(file);
        file.on('finish', () => {
            file.close(cb);
        });
    }).on('error', (err) => {
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        if (cb) cb(err.message);
    });
};

console.log("Downloading images...");

let completed = 0;
animals.forEach(animal => {
    // 공백을 _로 치환하여 파일명 생성
    const cleanName = animal.enName.replace(/\s+/g, '_');
    const filename = path.join(dir, `${cleanName}.jpg`);
    const url = `https://loremflickr.com/500/500/wildlife,${animal.enName.replace(/\s+/g, ',')}?lock=${animal.id}`;

    download(url, filename, () => {
        completed++;
        console.log(`Saved: ${filename}`);
        if (completed === animals.length) {
            console.log("All downloads finished!");
        }
    });
});
