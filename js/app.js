class MoodCard {
    constructor(moodLevel, note){
        this.DateTime = new Date();
        this.moodLevel = moodLevel;
        this.note = note;
    }
}

const generalTips = [
    "A regular sleep routine can help support a steadier mood.",
    "Drink enough water: even mild dehydration can affect how you feel.",
    "A 15-minute walk outside can lift your mood.",
    "Write down one small thing you are grateful for today.",
    "Take short breaks from screens during study sessions.",
    "Talking to a friend can make a heavy day feel lighter.",
];

const moodHistory = [
    new MoodCard(1, "very bad, nothing worked today"),
    new MoodCard(2, "tired after classes"),
    new MoodCard(3, "just a regular day"),
    new MoodCard(4, "finished the lab on time"),
    new MoodCard(5, "great day, met friends"),
    new MoodCard(3, "okay, a bit sleepy"),
    new MoodCard(4, "good walk in the evening"),
]
const moods = ["very_bad", "bad", "okay", "good", "very_good"]

const balanceTips = {
    low: [
        "Your mood has been low lately. Try to rest, eat well, and talk to someone you trust.",
        "A tough stretch is still just a stretch. Pick one small thing today that makes you feel a bit better.",
    ],
    mid: [
        "Your mood balance is steady. A short walk or a call with a friend could tip it towards the good side.",
        "You are doing okay. Try adding one small thing you enjoy to each day.",
    ],
    high: [
        "Your mood balance looks great. Note what is working so you can repeat it.",
        "Good streak! Keep up the habits that got you here, like sleep, movement and time with friends.",
    ],
};

const all_cards = document.querySelectorAll("article.card_1, article.card_2, article.card_3, article.card_4, article.card_5");
for (let card of all_cards){
    card.remove();
}


// рендерить картки з настроєм з масиву
function renderArticles(articles){
    const cards = document.querySelector("div.cards");
    cards.innerHTML = '';
    articles.forEach(article => {
        const card = document.createElement('article');
        card.classList.add(`card_${moodToLabel(article.moodLevel)}`);
        //клас додається не умовно ^, але я думаю це набагато красивіше ніж те що мені пропонує ТЗ 

        // card.classList.toggle('card_very_bad', moodToLabel(article.moodLevel) === 'very_bad');
        // card.classList.toggle('card_bad', moodToLabel(article.moodLevel) === 'bad');
        // card.classList.toggle('card_okay', moodToLabel(article.moodLevel) === 'okay');
        // card.classList.toggle('card_good', moodToLabel(article.moodLevel) === 'good');
        // card.classList.toggle('card_very_good', moodToLabel(article.moodLevel) === 'very_good');
        // клас додається умовно, заглушка для тз

        card.setAttribute('alt', 'mood_history_card')
        //заглушка для тз, ніякі інші атрибути придумати не зміг

        const date = document.createElement('h3');
        date.textContent = article.DateTime.toLocaleDateString('uk-UA');

        const text = document.createElement('p');
        text.textContent = article.note;

        card.append(date, text);
        cards.append(card);
    });
}
// оновлює статистику за середніми показниками настрою
function updStats(articles) {
    const sum1 = document.querySelector('p#sumtxt1');

    if (sum1) {
        sum1.textContent = genSumTxt1(articles);
    }

    const sum2 = document.querySelector('p#sumtxt2');
    if (sum2) {
        sum2.textContent = genSumTxt2(articles);
    }

    const sum3 = document.querySelector('p#sumtxt3');
    if (sum3) {
        sum3.textContent = genSumTxt3(articles);
    }

    const sum4 = document.querySelector('p#sumtxt4');
    if (sum4) {
        sum4.textContent = genSumTxt4();
    }
}

function countMood(searchedMoodLevel, scope){
    if (scope > moodHistory.length){
        return -1;
    }
    //перевірка

    let count = 0;
    for (let i = 0; i < scope; i++){
        if(moodHistory[i].moodLevel === searchedMoodLevel){
            count++;
        }
    }
    return count;
}

function genSumTxt1(articles){
    const n = Math.min(7, articles.length);
    const pct = level => Math.round(countMood(level, n) / n * 100);
    return `Your recent moods were ${pct(5)}% very good, ${pct(4)}% good, ${pct(3)}% okay, ${pct(2)}% bad, and ${pct(1)}% very bad.`
}

function genSumTxt2(articles){
    const recent = articles.slice(0, 7);
    const positive = recent.filter(a => a.moodLevel >= 4).length;
    const negative = recent.filter(a => a.moodLevel <= 2).length;
    let tone;
    if (positive > negative && negative <= recent.length / 4) {
        tone = "positive or okay";
    } else if (negative > positive) {
        tone = "low";
    } else {
        tone = "mixed";
    }
    return `Most of your recent moods were ${tone}. Keep tracking them to notice what affects your wellbeing.`;
}

//gets random item in list
const randomItem = list => list[Math.floor(Math.random() * list.length)];

//tip based on average mood of the last 7 entries
function genSumTxt3(articles){
    const avg = average(articles.slice(0, 7));
    const bucket = avg < 2.5 ? 'low' : avg < 3.5 ? 'mid' : 'high';
    return randomItem(balanceTips[bucket]);
}

//random general wellbeing tip
function genSumTxt4(){
    return randomItem(generalTips);
}

//finds average moodLevel in array of MoodCard
function average  (moods_array) {
    let avarage_val = 0;
    for (let mood_date of moods_array) { 
        avarage_val += mood_date.moodLevel;
    }
    return avarage_val/(moods_array.length);
}

if (average (moodHistory) >= 3){
    console.log("Good week");
}
else {
    console.log("Bad week");
}

//translates numerical value to mood level
const moodToLabel = mood => moods[mood-1];

renderArticles(moodHistory);
updStats(moodHistory);