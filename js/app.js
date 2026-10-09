const mood_array = [["07.06.26", 4], ["08.06.26", 5], ["09.06.26", 5], ["10.06.26", 4],  ["11.06.26", 3], ["12.06.26", 2], ["13.06.26", 1]]
const possible_moods = ["very bad", "bad", "okay", "good", "very good"]

//finds average  in array of [date, value]
function average  (moods_array) {
    let avarage_val = 0;
    for (let mood_date of moods_array) { 
        avarage_val += mood_date[1];
    }
    return avarage_val/(moods_array.length);
}

if (average (mood_array) >= 3){
    console.log("Good week");
}
else {
    console.log("Bad week");
}

//translates numerical value to mood level
const moodToLabel = mood => possible_moods[mood-1];
console.log(moodToLabel(4));
console.log(moodToLabel(5));