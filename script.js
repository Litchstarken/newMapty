'use strict';

// this is how Google Maps API works

// global variable for reference not good practice
// let map, mapEvent;

//----Parent Class for types of workouts----//
class Workout {
  // class fields not part of JS yet they are experimental, if we want to use them we need to include them in the constructor with the "this" keyword
  date = new Date();

  // this is a tecnique to have an unique number as id
  id = (Date.now() + '').slice(-10);

  // this is an example on how to make a method accesible from outside the classes // creating a public interface
  clicks = 0;

  constructor(coords, distance, duration) {
    // this.date = //some prop/value
    // this.id = // some prop /value
    this.coords = coords; // need an Array of coordinates [LAT, LONG]
    this.distance = distance; // needs the convecrtion in Kms
    this.duration = duration; // needs the convertion in secs
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    // type the activity in uppercase to capitalize 1st letter
    // prettier-ignore
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }

  // This is how we set the public interface
  click() {
    this.clicks++;
  }

  _editWorkout() {
    // log what is coming from the args...
    console.log('editing...');
    // call the form with the data of the corresponding workout
  }

  _deleteWorkout() {
    console.log('deleting...');
  }
}

//----Child Classes----//

class Running extends Workout {
  // class field running
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  // class field cycling
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

//----TESTING CHILD CLASSES----//

// const run1 = new Running([51,-13], 34, 12, 123);
// const cicle1 = new Cycling([51,-23], 324, 122, 14);

// console.log('testing run', run1);
// console.log('testing cicle', cicle1);

//---------------APPLICATION ARCHITECTURE (MAIN CLASS)-----------------//

// selecting inputs from the HTML
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  // by declaring the variables inside the class, they will be converted to private instances properties, and this properties are going to be present in
  // all the instances created by this class
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    // by calling this function inside the constructor will be call when a new instance is created. We get the user´s position
    this._getPosition();

    //editBtn.addEventListener('click', this._editWorkout.bind(this));
    // get data from local storage
    this._getLocalStorage();

    // we bind the this keyword here because we want to the _newWorkout method point to the App object not to the form
    form.addEventListener('submit', this._newWorkout.bind(this));

    // handling selections, to hide one while showing the other with the toggle
    inputType.addEventListener('change', this._toggleElevationField.bind(this));
    // moving the map to the selected workout in the list, we create an event to listen what workout was clicked then move the map that location.
    // also we need to bind the _moveToPopup method so we point it to the App object, if not we are going to have an error because of the private var
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }
  // validation using class methods
  _getPosition() {
    if (navigator.geolocation) {
      // this._loadMap its a callback that will pass the location of the user position,
      // but we need to "bind" it to "this" to correctly point it to the current object to make it work in this case the App object
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
    }
  }

  _loadMap(position) {
    // A good practice is to abstract in to variables values that are going to do the same, or be used several times.
    const cordsPos = position.coords;
    const { latitude } = cordsPos;
    const { longitude } = cordsPos;

    // testing google maps API
    console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];
    // the second parameter in the setView method is the zoom value
    // "L" is a convention keyword to use the leaflet library to refer to the Main Class
    // the "map" is an object with all the methods availables from leaflet library
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    // testing the map object
    console.log('test map object', map);

    // we can change the style of the openstreetmap, in this case the "fr/hot" gives the streets a red color
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // event to add an event
    this.#map.on('click', this._showForm.bind(this));

    // we are going to render the #workouts in the list
    // we execute this here because we need the map to be loaded first
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
      this._renderWorkoutMarker(work);
    });
  }

  // this method show the form when the map is clicked byt removing the "hidden" css class
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _editWorkoutForm(e) {
    e.preventDefault();
    form.classList.remove('hidden');
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value = inputDuration.value = inputCadence.value = '';
    // Hide Form
    form.style.display = 'none';
    // add transition hidden class
    form.classList.add('hidden');
    // add transition show again after a new click on the map is detected
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _newWorkout(e) {
    e.preventDefault();
    // when we use the rest operator we get an array
    // with this methods we are validating if every input received is a number and return a boolean
    const validInputs = (...inputs) =>
      inputs.every(inpNum => Number.isFinite(inpNum));
    // with this method we are validating if every input received is a positive number and return a boolean
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // get the input values from the FORM
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    // Render workout on map as marker // Display Marker

    // destructuring the mapEvent
    const { lat, lng } = this.#mapEvent.latlng;

    // we put the workout variable to have access to it all across the function
    let workout;

    // Validation if the workout is Running, then create a new running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert('not a valid input or is a negative number');
      }
      // here we are creating the new object
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // Validation if the workout is Cycling, then create a new Cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
        return alert('not a valid input');
      }
      // here we are creating the new object
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Here we are adding the new objects to workout array // pushing objects to the workout array
    this.#workouts.push(workout);

    // All this bellow are delegations, so they are called here but setted in other place.

    // Here we set the data for the marker position in the map
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + Clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    // the following code is responsible for adding the mark in the map
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 150,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
            <h2 class="workout__title">${workout.description}</h2>
            <div class="workout__details">
                <span class="workout__icon">${
                  workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
                }</span>
                <span class="workout__value">${workout.distance}</span>
                <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⏱</span>
                <span class="workout__value">${workout.duration}</span>
                <span class="workout__unit">min</span>
            </div>
            <!-- <button class="workout_edit">Edit</button>
            <button class="workout_delete">Delete</button> -->
      `;
    workout.type === 'running'
      ? (html += `
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.pace.toFixed(1)}</span>
                <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">🦶🏼</span>
                <span class="workout__value">${workout.cadence}</span>
                <span class="workout__unit">spm</span>
            </div>
        </li>   
        `)
      : (html += `
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.speed.toFixed(1)}</span>
                <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⛰</span>
                <span class="workout__value">${workout.elevationGain}</span>
                <span class="workout__unit">m</span>
            </div>
        </li>
        `);
    // here we insert this markup to the DOM
    form.insertAdjacentHTML('afterend', html);
  }

  // Here we are going to emmit the event, so we can match the element that we are looking for.
  _moveToPopup(e) {
    // with the closest(); method we move from the element that is clicked/selected to the closest parent of that element.
    const workoutEl = e.target.closest('.workout');
    console.log('test elem', workoutEl);
    // guard close
    if (!workoutEl) return;
    // get the workout data form the workout array, here we are comparing the id in the workoutEl and the id in the workout array
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    console.log(workout);
    // After the above code is setup we can proceed to move the map to the given coordenates by using a leaflet method setView(); which receives
    // as arguments the coords, the elevation, and an object where we can setup some properties.
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
    // This is how we use the public interface
    workout.click();
  }

  _setLocalStorage() {
    // This localstorage method is provided by the browser API, the first parameter to setItem is a name and the second must be an string, this is like a
    // key-value store relationship, this second parameter "in this example" is converted to string by using the stringify method
    // with this we are setting all the workouts to local storage
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  // this method is executed right after the page is loaded
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    // const data = JSON.parse(JSON.stringify(localStorage.getItem('workouts')));

    console.log('data from storage', data);
    // guard clause
    if (!data) return;

    //   const runn = data.forEach(function(data){
    //     cadence: data.cadence,
    //     clicks: data.clicks,
    //     coords: data.coords,
    //     date: data.date,
    //     description: data.description,
    //     distance: data.distance,
    //     duration: data.duration,
    //     id: data.id,
    //     pace: data.pace,
    //     type: data.type,
    //   }
    // );

    // for (let i of data) {
    //   let newData = Object.create(i);
    //   console.log('testing new data', newData);
    //   if (newData.type === 'running') {
    //     console.log('run');
    //     console.log('testing new data inside', newData);
    //     this._renderWorkout(newData);
    //   } else {
    //     console.log('cicle');
    //   }
    // }

    // here we are restoring the data, the _getLocalStorage method always executes when the page loads
    // so the first time it loads the data is empty, but if we have some data already in the local storage will be setted
    // this.#workouts = data;
    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  // method to remove the local storage manually
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

// new instance of the App
const app = new App();
