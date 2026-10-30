// API для записів настрою (мок-дані JSONPlaceholder): https://jsonplaceholder.typicode.com/
const API_URL = 'https://jsonplaceholder.typicode.com/comments?postId=1';

class MoodCard {
    constructor(moodLevel, note, dateTime = new Date(), title = '', email = ''){
        this.DateTime = dateTime;
        this.moodLevel = moodLevel;
        this.note = note;
        this.title = title;
        this.email = email;
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

//returns the date n days before today (midnight)
function daysAgo(n){
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - n);
    return date;
}

// записи з API + записи, додані через форму
const moodHistory = [];
// записи, отримані з API під час останнього завантаження
let apiRecords = [];
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

// сортує записи за датою: нові - перші
function sortByDate(articles){
    articles.sort((a, b) => b.DateTime - a.DateTime);
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

        card.setAttribute('data-mood', `${article.moodLevel}`)

        const date = document.createElement('h3');
        date.textContent = article.DateTime.toLocaleDateString('uk-UA');
        card.append(date);

        if (article.title) {
            const title = document.createElement('h4');
            title.textContent = article.title;
            card.append(title);
        }

        const text = document.createElement('p');
        text.textContent = article.note;
        card.append(text);

        if (article.email) {
            const email = document.createElement('small');
            email.textContent = article.email;
            card.append(email);
        }

        cards.append(card);
    });
}
// оновлює статистику за середніми показниками настрою
function updStats(articles) {
    if (articles.length === 0) {
        document.querySelectorAll('#summary p').forEach(p => p.textContent = '');
        document.querySelector('p#sumtxt1').textContent = 'No mood records yet.';
        return;
    }

    const sum1 = document.querySelector('p#sumtxt1');

    if (sum1) {
        sum1.textContent = genSumTxt1(articles);
    }

    const sum2 = document.querySelector('p#sumtxt2');
    if (sum2) {
        sum2.textContent = genSumTxt2(articles);
    }

    const sum3 = document.querySelector('p#avg-mood');
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

function logWeek(){
    if (average (moodHistory) >= 3){
        console.log("Good week");
    }
    else {
        console.log("Bad week");
    }
}

//translates numerical value to mood level
const moodToLabel = mood => moods[mood-1];

// мок-запис з API -> MoodCard: name - заголовок, body - нотатка, email - автор;
// рівня настрою і дати в мок-даних немає, тож вони виводяться з id
function commentToMoodCard(comment){
    const moodLevel = (comment.id % 5) + 1;
    return new MoodCard(moodLevel, comment.body, daysAgo(comment.id), comment.name, comment.email);
}

const refreshBtn = document.querySelector('#refresh-btn');
const loadStatus = document.querySelector('#load-status');
const loadError = document.querySelector('#load-error');

function showLoading(isLoading){
    loadStatus.hidden = !isLoading;
    refreshBtn.disabled = isLoading;
}

function showError(message){
    loadError.textContent = message;
    loadError.hidden = message === '';
}

// завантажує записи настрою з JSONPlaceholder (https://jsonplaceholder.typicode.com/comments?postId=1)
// і перемальовує список; записи, додані через форму, не губляться
async function loadData(){
    showLoading(true);
    showError('');
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`Server responded with status ${response.status}`);
        }
        const data = await response.json();
        console.log(data);

        const localRecords = moodHistory.filter(card => !apiRecords.includes(card));
        apiRecords = data.map(commentToMoodCard);
        moodHistory.length = 0;
        moodHistory.push(...localRecords, ...apiRecords);
        sortByDate(moodHistory);

        renderArticles(moodHistory);
        updStats(moodHistory);
        logWeek();
    } catch (error) {
        showError('Записи тимчасово недоступні');
        console.error(error);
    } finally {
        showLoading(false);
    }
}

// кнопка «Refresh» - повторний запит без перезавантаження сторінки
refreshBtn.addEventListener('click', loadData);

updStats(moodHistory);
loadData();


const form = document.querySelector('#mood-form');
const dateInput = document.querySelector('#mood-date');
const moodInput = document.querySelector('#mood-level');
const noteInput = document.querySelector('#mood-note');
const noteCounter = document.querySelector('#note-counter');

// оновлює лічильник символів, що залишилися до maxlength нотатки
function updNoteCounter(){
    const left = noteInput.maxLength - noteInput.value.length;
    noteCounter.textContent = `${left} characters left`;
}

// додаткова валідація mood: значення має бути в межах 1-5
moodInput.addEventListener('input', () => {
    const value = Number(moodInput.value);
    if (moodInput.value !== '' && (value < 1 || value > 5)) {
        moodInput.setCustomValidity('Mood must be between 1 and 5');
    } else {
        moodInput.setCustomValidity('');
    }
});

// лічильник символів нотатки оновлюється на кожне натискання
noteInput.addEventListener('input', updNoteCounter);

// сабміт форми: додає новий запис у масив і перемальовує список без перезавантаження
form.addEventListener('submit', event => {
    event.preventDefault();

    const date = new Date(`${dateInput.value}T00:00`);
    const moodLevel = Number(moodInput.value);
    const note = noteInput.value.trim();

    moodHistory.push(new MoodCard(moodLevel, note, date));
    sortByDate(moodHistory);

    renderArticles(moodHistory);
    updStats(moodHistory);

    form.reset();
    moodInput.setCustomValidity('');
    updNoteCounter();
});