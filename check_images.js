const fs = require('fs');
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
    { id: 22, name: "재규어", enName: "jaguar animal" },
    { id: 23, name: "블랙맘바", enName: "black mamba" },
    { id: 24, name: "말코손바닥사슴", enName: "moose" },
    { id: 25, name: "그린 아나콘다", enName: "green anaconda" },
    { id: 26, name: "퓨마", enName: "cougar" },
    { id: 27, name: "울버린", enName: "wolverine" },
    { id: 28, name: "화식조", enName: "cassowary" },
    { id: 29, name: "아메리카 들소", enName: "american bison" },
    { id: 30, name: "타조", enName: "ostrich" }
];

const imageDir = path.join(__dirname, 'images');

console.log("Checking image files...");

animals.forEach(animal => {
    const filename = animal.enName.replace(/\s+/g, '_') + '.jpg';
    const filePath = path.join(imageDir, filename);

    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > 0) {
            console.log(`[OK] ${animal.name}: ${filename} (${stats.size} bytes)`);
        } else {
            console.error(`[ERROR] ${animal.name}: ${filename} exists but is EMPTY (0 bytes).`);
        }
    } else {
        console.error(`[MISSING] ${animal.name}: expected ${filename} but not found.`);
    }
});
