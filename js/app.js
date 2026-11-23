
class MoodCard {
    constructor(moodLevel, note, dateTime = new Date(), id = null){
        this.id = id; // assigned by IndexedDB (autoIncrement) when the record is saved
        this.DateTime = dateTime;
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


/* ===================== Data model ===================== */
// One stored record (variant 3): { id: number, date: 'YYYY-MM-DD', mood: 1-5, note: string }

// formats a Date as 'YYYY-MM-DD' in local time
function toDateString(date){
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// MoodCard -> plain record for storage (no id yet = IndexedDB will generate one)
function toRecord(card){
    const record = { date: toDateString(card.DateTime), mood: card.moodLevel, note: card.note };
    if (card.id !== null && card.id !== undefined) {
        record.id = card.id;
    }
    return record;
}

// plain record from storage -> MoodCard used by the UI
function fromRecord(record){
    return new MoodCard(record.mood, record.note, new Date(`${record.date}T00:00`), record.id);
}

// checks that a record read from storage has the expected shape
function isValidRecord(record){
    return record !== null && typeof record === 'object'
        && Number.isInteger(record.mood) && record.mood >= 1 && record.mood <= 5
        && typeof record.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(record.date);
}


/* ===================== localStorage ===================== */

const LS_KEY = 'moodEntries';
const LS_MIGRATED_KEY = 'moodEntriesMigrated';

// safe wrappers: localStorage itself can throw when site data is blocked
function lsGet(key){
    try {
        return localStorage.getItem(key);
    } catch (error) {
        return null;
    }
}

function lsSet(key, value){
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.error('localStorage is not available:', error);
        return false;
    }
}

// saves the array of records to localStorage as a JSON string
function saveToLocalStorage(items){
    return lsSet(LS_KEY, JSON.stringify(items));
}

// reads the array of records from localStorage; damaged data -> empty list
function loadFromLocalStorage(){
    try {
        const raw = lsGet(LS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter(isValidRecord) : [];
    } catch (error) {
        console.error('Damaged data in localStorage:', error);
        return [];
    }
}


/* ===================== IndexedDB ===================== */

const DB_NAME = 'MoodTrackerDB';
const DB_VERSION = 1;
const STORE_NAME = 'moodEntries';

let dbPromise = null;

// opens (and on first run creates) the database; the connection is reused by all operations
function openDB(){
    if (dbPromise) {
        return dbPromise;
    }
    dbPromise = new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error('IndexedDB is not supported'));
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        // runs only when the database is new or its version is lower than DB_VERSION
        request.onupgradeneeded = event => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    // a failed attempt should not be cached forever
    dbPromise.catch(() => { dbPromise = null; });
    return dbPromise;
}

// adds a record (or overwrites one with the same id) via put; resolves with the record's id
async function addItem(item){
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const request = tx.objectStore(STORE_NAME).put(item);
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}

// updates an existing record: put with the same id replaces it instead of creating a duplicate
async function updateItem(item){
    if (item.id === undefined) {
        throw new Error('updateItem needs a record with an id');
    }
    return addItem(item);
}

// adds several records in one transaction: either all of them are saved or none
async function addItems(items){
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        items.forEach(item => store.put(item));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}

// reads all records from the store
async function getAllItems(){
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// deletes the record with the given id
async function deleteItem(id){
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}

// one-time move of records saved in localStorage into IndexedDB;
// the "migrated" flag keeps it from running (and duplicating data) on every page load
async function migrateFromLocalStorage(){
    if (lsGet(LS_MIGRATED_KEY) === 'true') {
        return;
    }
    const existing = await getAllItems();
    const legacy = loadFromLocalStorage();
    if (existing.length === 0 && legacy.length > 0) {
        await addItems(legacy);
        console.log(`Migrated ${legacy.length} mood records from localStorage to IndexedDB`);
    }
    lsSet(LS_MIGRATED_KEY, 'true');
}


/* ===================== Summary ===================== */

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

// updates the summary texts based on the mood records
function updStats(articles) {
    const empty = articles.length === 0;

    const sum1 = document.querySelector('p#sumtxt1');
    if (sum1) {
        sum1.textContent = empty
            ? "You have no mood entries yet. Add one with the form to see your summary."
            : genSumTxt1(articles);
    }

    const sum2 = document.querySelector('p#sumtxt2');
    if (sum2) {
        sum2.textContent = empty ? "" : genSumTxt2(articles);
    }

    const sum3 = document.querySelector('p#avg-mood');
    if (sum3) {
        sum3.textContent = empty ? "" : genSumTxt3(articles);
    }

    const sum4 = document.querySelector('p#sumtxt4');
    if (sum4) {
        sum4.textContent = genSumTxt4();
    }
}

// counts records with the given mood level among the first `scope` records
function countMood(searchedMoodLevel, scope, articles){
    if (scope > articles.length){
        return -1;
    }

    let count = 0;
    for (let i = 0; i < scope; i++){
        if(articles[i].moodLevel === searchedMoodLevel){
            count++;
        }
    }
    return count;
}

// mood percentages for the last 7 records
function genSumTxt1(articles){
    const n = Math.min(7, articles.length);
    const pct = level => Math.round(countMood(level, n, articles) / n * 100);
    return `Your recent moods were ${pct(5)}% very good, ${pct(4)}% good, ${pct(3)}% okay, ${pct(2)}% bad, and ${pct(1)}% very bad.`
}

// overall tone of the last 7 records
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

// gets random item in list
const randomItem = list => list[Math.floor(Math.random() * list.length)];

// tip based on average mood of the last 7 entries
function genSumTxt3(articles){
    const avg = average(articles.slice(0, 7));
    const bucket = avg < 2.5 ? 'low' : avg < 3.5 ? 'mid' : 'high';
    return randomItem(balanceTips[bucket]);
}

// random general wellbeing tip
function genSumTxt4(){
    return randomItem(generalTips);
}

// finds average moodLevel in array of MoodCard
function average  (moods_array) {
    let avarage_val = 0;
    for (let mood_date of moods_array) {
        avarage_val += mood_date.moodLevel;
    }
    return avarage_val/(moods_array.length);
}

// logs whether the week was good or bad
function logWeek(articles){
    if (articles.length === 0) {
        return;
    }
    if (average(articles) >= 3){
        console.log("Good week");
    }
    else {
        console.log("Bad week");
    }
}


/* ===================== Vue UI ===================== */

// card for a single mood record; emoji, card class and date are computed from props
const MoodEntry = {
    props: {
        date: { type: Date, required: true },
        mood: { type: Number, required: true, validator: value => value >= 1 && value <= 5 },
        note: { type: String, default: '' },
    },
    emits: ['cycle-mood', 'delete'],
    computed: {
        emoji() {
            return ['😞', '🙁', '😐', '🙂', '😄'][this.mood - 1];
        },
        label() {
            return ['very_bad', 'bad', 'okay', 'good', 'very_good'][this.mood - 1];
        },
        formattedDate() {
            return this.date.toLocaleDateString('uk-UA');
        },
    },
    template: `
        <article :class="'card_' + label" :data-mood="mood">
            <div class="entry-head">
                <h3>{{ formattedDate }}</h3>
                <div class="entry-actions">
                    <button type="button" class="mood-emoji"
                            :title="'Mood ' + mood + '/5 - click to change'"
                            :aria-label="'Mood ' + mood + ' of 5, change mood'"
                            @click="$emit('cycle-mood')">{{ emoji }}</button>
                    <button type="button" class="delete-entry"
                            title="Delete entry"
                            :aria-label="'Delete entry from ' + formattedDate"
                            @click="$emit('delete')">✕</button>
                </div>
            </div>
            <p>{{ note }}</p>
        </article>`,
};

// mood history section: loads records from IndexedDB and renders them as MoodEntry cards
const historyApp = Vue.createApp({
    components: { MoodEntry },
    data() {
        return {
            entries: [],
            loading: true,
            useIndexedDB: true,   // false = IndexedDB failed to open, records live in localStorage
            storageMessage: '',
        };
    },
    computed: {
        // records sorted by date, newest first
        sortedEntries() {
            return [...this.entries].sort((a, b) => b.DateTime - a.DateTime);
        },
    },
    watch: {
        // refreshes the summary whenever records are loaded, added or changed
        entries: {
            handler() {
                updStats(this.sortedEntries);
                logWeek(this.entries);
            },
            deep: true,
        },
    },
    async mounted() {
        await this.init();
    },
    methods: {
        // opens the database, runs the one-time migration and shows the stored records
        async init() {
            try {
                await openDB();
                await migrateFromLocalStorage();
                await this.refresh();
            } catch (error) {
                console.error('Could not open IndexedDB:', error);
                this.useIndexedDB = false;
                this.storageMessage = 'Your browser does not allow IndexedDB here (for example, in private browsing), '
                    + 'so entries are saved in localStorage instead.';
                this.loadLocal();
            } finally {
                this.loading = false;
            }
        },
        // re-reads the whole list from IndexedDB, so the screen always matches the database
        async refresh() {
            const records = await getAllItems();
            this.entries = records.map(fromRecord);
        },
        // fallback: reads records from localStorage
        loadLocal() {
            this.entries = loadFromLocalStorage().map(fromRecord);
        },
        // fallback: writes the current list to localStorage after every change
        saveLocal() {
            if (!saveToLocalStorage(this.entries.map(toRecord))) {
                this.storageMessage = 'Changes could not be saved: browser storage is not available.';
            }
        },
        // runs a database operation and reports a failure to the user instead of failing silently
        async runDbOperation(operation) {
            try {
                await operation();
                await this.refresh();
                return true;
            } catch (error) {
                console.error('IndexedDB operation failed:', error);
                this.storageMessage = 'Could not save the change. Please try again.';
                return false;
            }
        },
        // create: adds a new record
        async addEntry(card) {
            if (!this.useIndexedDB) {
                card.id = this.entries.reduce((max, e) => Math.max(max, e.id), 0) + 1;
                this.entries.push(card);
                this.saveLocal();
                return true;
            }
            return this.runDbOperation(() => addItem(toRecord(card)));
        },
        // update: switches the record's mood to the next level (5 wraps to 1)
        async cycleMood(id) {
            const entry = this.entries.find(e => e.id === id);
            if (!entry) {
                return;
            }
            const nextMood = (entry.moodLevel % 5) + 1;
            if (!this.useIndexedDB) {
                entry.moodLevel = nextMood;
                this.saveLocal();
                return;
            }
            await this.runDbOperation(() => updateItem({ ...toRecord(entry), mood: nextMood }));
        },
        // delete: removes the record after confirmation
        async deleteEntry(id) {
            if (!confirm('Delete this mood entry?')) {
                return;
            }
            if (!this.useIndexedDB) {
                this.entries = this.entries.filter(e => e.id !== id);
                this.saveLocal();
                return;
            }
            await this.runDbOperation(() => deleteItem(id));
        },
    },
    template: `
        <h2>Your mood history</h2>
        <p v-if="storageMessage" class="storage-status" role="status">{{ storageMessage }}</p>
        <p v-if="loading" class="history-empty">Loading your entries…</p>
        <p v-else-if="entries.length === 0" class="history-empty">No entries yet. Mark your mood with the form.</p>
        <div class="cards">
            <MoodEntry
                v-for="entry in sortedEntries"
                :key="entry.id"
                :date="entry.DateTime"
                :mood="entry.moodLevel"
                :note="entry.note"
                @cycle-mood="cycleMood(entry.id)"
                @delete="deleteEntry(entry.id)" />
        </div>`,
});

const historyVm = historyApp.mount('#history');


/* ===================== Form ===================== */

const form = document.querySelector('#mood-form');
const dateInput = document.querySelector('#mood-date');
const moodInput = document.querySelector('#mood-level');
const noteInput = document.querySelector('#mood-note');
const noteCounter = document.querySelector('#note-counter');

// updates the counter of characters left in the note
function updNoteCounter(){
    const left = noteInput.maxLength - noteInput.value.length;
    noteCounter.textContent = `${left} characters left`;
}

// extra mood validation: value must be between 1 and 5
moodInput.addEventListener('input', () => {
    const value = Number(moodInput.value);
    if (moodInput.value !== '' && (value < 1 || value > 5)) {
        moodInput.setCustomValidity('Mood must be between 1 and 5');
    } else {
        moodInput.setCustomValidity('');
    }
});

noteInput.addEventListener('input', updNoteCounter);

// form submit: saves a new record without reloading the page
form.addEventListener('submit', async event => {
    event.preventDefault();

    const date = new Date(`${dateInput.value}T00:00`);
    const moodLevel = Number(moodInput.value);
    const note = noteInput.value.trim();

    const saved = await historyVm.addEntry(new MoodCard(moodLevel, note, date));
    if (!saved) {
        return; // keep what the user typed so they can retry
    }

    form.reset();
    moodInput.setCustomValidity('');
    updNoteCounter();
});
