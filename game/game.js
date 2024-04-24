(function() {
    'use strict';

/*
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+                                                                                          +  
+                                     Var and Constants                                    +                + 
+                                                                                          +
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
*/

    // Canvas
    var canvas = document.getElementById('snakeBoard'),
      ctx = canvas.getContext('2d'),
      scoreContainer = document.getElementsByClassName('score')[0];
  
    // Modals 
    var modal = {
      init() {
        this.prim_button.addEventListener('click', this.handleClick);
      },
      show() {
        if (this.hidden) {
          this.elem.classList.remove('hidden');
          this.hidden = false;
        }
      },
      hide() {
        if (!this.hidden) {
          this.elem.classList.add('hidden');
          this.hidden = true;
        }
      },
      handleClick() {}
    };
  
    // Modal shown at the beginning of the game.
    var startModal = {
      elem: document.getElementById('modal_start'),
      prim_button: document.getElementById('btn_start'),
      hidden: false,
      init: modal.init,
      show: modal.show,
      hide: modal.hide,
      handleClick: startGame
    };
  
    // Modal shown when the game ends.
    var endModal = {
      elem: document.getElementById('modal_end'),
      prim_button: document.getElementById('btn_restart'),
      hidden: true,
      init: modal.init,
      show: modal.show,
      hide: modal.hide,
      handleClick: restartGame
    };
  
    startModal.init();
    endModal.init();
  
    // Represents a coordinate in the pixel space
    var Coord = {
      x: null,
      y: null,
      init(x = 0, y = 0) {
        this.x = x;
        this.y = y;
        return this;
      },
      // Accepts another Coord parameter returns true if same, false otherwise
      equals(anotherCoord) {
        return this.x === anotherCoord.x && this.y === anotherCoord.y;
      },
      moveRight() {
        if (this.x + 1 === numCols)
          this.x = 0;
        else
          this.x = this.x + 1;
      },
      moveLeft() {
        if (this.x - 1 < 0)
          this.x = numCols - 1;
        else
          this.x = this.x - 1;
      },
      moveUp() {
        if (this.y - 1 < 0)
          this.y = numRows - 1;
        else
          this.y = this.y - 1;
      },
      moveDown() {
        if (this.y + 1 === numRows)
          this.y = 0;
        else
          this.y = this.y + 1;
      }
    };
  
    // Represents a pixel in the grid
    var Pixel = {
      index: null,
      coord: null,
      color: null,
      alpha: null,
      init({
        x = 0,
        y = 0,
        width = PIXEL_DIM,
        height = PIXEL_DIM,
        color = GRID_COLOR,
        alpha = 1
      } = {
        x: 0,
        y: 0,
        width: PIXEL_DIM,
        height: PIXEL_DIM,
        color: GRID_COLOR,
        alpha: 1
      }) {
        this.coord = Object.create(Coord).init(x, y);
        this.width = width;
        this.height = height;
        this.color = color;
        this.alpha = alpha;
  
        return this;
      },
    };
  
    // Properties (Constants and Variables)
    var pixels,
      width,
      height,
      numRows,
      numCols;
    const GRID_COLOR = '#222', // Color of the squares that make up the grid
      BG_COLOR = '#101010',
      PIXEL_DIM = 20, // (Grid square dimension) The width and height of each grid square
      PIXEL_SEPARATION = 2, // PIXEL_SEPARATION between each square in the grid
      // This factor after taking in account the dimension of each pixel and the separation between them
      // helps in deciding the number of pixels in the grid when calculated later with window width and height
      FACTOR = PIXEL_DIM + PIXEL_SEPARATION;
  
    // For food
    var foodPixel;
    const FOOD_COLOR = '#FFF';

    // For obstacles
    var obstaclePixel = []
    const OBSTACLE_COLOR = '#FF0000';

    // !!! Animation Variables in the settings file !!!

    // For the snake
    var snakeLength,
      snakeHeadPosition,
      move;
    var SNAKE_COLOR = '#38e490';
      // !!! Snake length in the settings file !!!
  
    // Stores the previous frame's position of the snake
    var prevSnakeCoords = [],
      debouncedNextFrame = debounce(nextFrame, FRAME_REFRESH_INTERVAL),
      reduceLengthTimeInterval,
      scoreTimeInterval,
      rafId,
      userIsPlaying = false,
      score = 0;
    
    // Variables for the shield
    var shieldActivated = false; // Variable to check if the shield is activated
    var shieldDesactivated = false; // Variable to check if the shield is desactivated
    var shieldUsed = false; // Variable to check if the shield has been used
    const SHIELD_COLOR = 'gold'; // Color of the shield
    const SHIELD_DURATION = 5000; // Duration of the shield in milliseconds

    // id of the shield button
    var shieldButton = document.getElementById('shield-button');

    // Event listener for restart button
    var restartButton = document.getElementById('btn_restart');
    restartButton.addEventListener('click', function() {
      shieldUsed = false;
    });
    
    // Update the score
    var highScore = 0;
    var highScoreContainer = document.getElementById('highScore'); // HTML id to display the highest score    

/*
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+                                                                                            +
+                                         Functions                                          +
+                                                                                            +
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
*/

    // Function to activate the shield
    function activateShield() {
      // Check if the shield has already been used
      if (!shieldUsed) {
      // When the button is clicked, activate the shield and change the color of the snake
      shieldActivated = true;
      SNAKE_COLOR = SHIELD_COLOR; // Change the color of the snake to the shield color

      // Reset the shield after a certain amount of time
      setTimeout(function() {
        shieldActivated = false;
        SNAKE_COLOR = '#38e490'; // Reset the color of the snake
      }, SHIELD_DURATION);

      shieldUsed = true; // Set the shield as used
      }
    }

    shieldButton.addEventListener('click', activateShield);

    // Reset shield variables when restarting the game
    shieldActivated = false;
    shieldUsed = false;
  
   // Function to populate the pixels
    function populatePixels() {
      width = +canvas.getAttribute('width').split('px')[0];
      height = +canvas.getAttribute('height').split('px')[0];
  
      numRows = Math.floor(height / FACTOR);
      numCols = Math.floor(width / FACTOR);
  
      pixels = [];
  
      for (var row = 0; row < numRows; row++) {
        for (var col = 0; col < numCols; col++) {
          pixels.push(Object.create(Pixel).init({
            x: col,
            y: row,
            color: GRID_COLOR
          }));
        }
      }
    }
  
    // Initialize the game
    function init() {
      document.getElementsByTagName('body')[0].setAttribute('bgcolor', BG_COLOR);
    }
  
    // Start the game
    function startGame() {
      if (!userIsPlaying) {
        userIsPlaying = true;
        // Show canvas
        canvas.style.display = 'block';
        // Hide Modal
        startModal.hide();
        // Draw Game
        populatePixels();
        initGameState();
        // Initialize score
        scoreContainer.classList.remove('flash');
        scoreContainer.innerHTML = '' + score;
        // Initialize timers
        reduceLengthTimeInterval = setInterval(decreaseSnakeLength, SNAKE_SHORTEN_INTERVAL);
        scoreTimeInterval = setInterval(incrementScore, SCORE_INCREMENT_INTERVAL);
        // Fire Animation
        rafId = requestAnimationFrame(nextFrame);
      }
    }
  
    // Decrease the length of the snake
    function decreaseSnakeLength() {
      snakeLength = snakeLength - 1;
      if (snakeLength <= 0) {
        gameOver();
      }
    }

    // Update highest score if necessary
    function updateHighScore() {
      if (score > highScore) {
        highScore = score;
        highScoreContainer.innerHTML = 'Meilleur score : ' + highScore;
        localStorage.setItem('highScore', highScore); // Save the highest score to local storage
      }
    }

    // Update highest score if necessary
    score++;
    scoreContainer.innerHTML = '' + score;
    updateHighScore();

    // Define a function to increment the score
    function incrementScore() {
      if (userIsPlaying) {
        score++;
        scoreContainer.innerHTML = '' + score;
        updateHighScore();
      }
    }

    // Call incrementScore every time the score needs to be updated
    incrementScore();

    // Reset the highest score when the game is over
    function gameOver() {
      if (userIsPlaying) {
        userIsPlaying = false;
        // Stop timers
        clearInterval(reduceLengthTimeInterval);
        clearInterval(scoreTimeInterval);
        // Reset Score
        score = 0;
        scoreContainer.classList.add('flash');
        // Show end modal
        endModal.show();
        // Stop Animation
        cancelAnimationFrame(rafId);
        // Do not reset highest score
        // highScore = 0;
        // highScoreContainer.innerHTML = '' + highScore;
      }
      if (obstaclePixel.coord.equals(snakeHeadPosition)) {
        gameOver();
      }
    }
  
    // Restarts the game, 
    // Fired when 'Play again' button is clicked.
    function restartGame() {
      if (!userIsPlaying) {
        endModal.hide();
        startGame();
      }
    }
  
    // Initialize the game state
    function initGameState() {
      prevSnakeCoords = [];
      snakeLength = INITIAL_SNAKE_LENGTH;
      foodPixel = randomPixelOnGrid();
      obstaclePixel = []; // Reset the obstacles
      for (let i = 0; i < NUM_OBSTACLES; i++) {
        obstaclePixel.push(randomPixelOnGrid()); // Add a random obstacle to the grid
      }
      snakeHeadPosition = randomPixelOnGrid().coord;
      move = Coord.moveRight;
    }
    
    // The game animates by showing multiple individual frames per second
    // The following function sets up each frame.
    // Collision detection is done in this function
    function nextFrame() {
      ctx.clearRect(0, 0, width, height);

      // An array of Coords holding coordinates of each grid cell that makes up the snake
      var snakeCoords = isFirstAnimationFrame() ?
        initialSnakePosition(snakeHeadPosition, snakeLength) :
        newSnakePosition(Object.create(Coord).init(snakeHeadPosition.x, snakeHeadPosition.y));

      for (var i = 0; i < pixels.length; i++) {
        var cp = pixels[i]; // Current Pixel

        drawPixel(cp, GRID_COLOR);
        if (isASnakePixel(cp, snakeCoords)) {
          drawPixel(cp, SNAKE_COLOR);
          if (isFoodPixel(cp)) { // If food and snake pixel coincide that means the snake ate the food
            snakeLength++;
            foodPixel = randomPixelOnGrid();
          }
          // Check for collision with any obstacle
          var obstacleCollision = false;
          for (var j = 0; j < obstaclePixel.length; j++) {
            if (obstaclePixel[j].coord.equals(cp.coord)) {
              if (!shieldActivated) {
                gameOver();
                obstacleCollision = true;
                break; // Exit the loop since the game is over
              } else {
                obstaclePixel[j] = foodPixel;
              }
              if (shieldActivated) {
                shieldDesactivated = true;
                foodPixel = randomPixelOnGrid();
              }
            }
          }
          if (obstacleCollision) {
            continue; // Skip to the next iteration of the loop
          }
        }
        if (isFoodPixel(cp))
          drawPixel(cp, FOOD_COLOR);
        for (var k = 0; k < obstaclePixel.length; k++) {
          if (obstaclePixel[k].coord.equals(cp.coord))
            drawPixel(cp, OBSTACLE_COLOR);
        }
      }

      prevSnakeCoords = snakeCoords;
      move.call(snakeHeadPosition);
      requestAnimationFrame(debouncedNextFrame);
    }
    
    // Drawing pixels on the canvas
    function drawPixel(pixel, color) {
      ctx.fillStyle = color;
      ctx.fillRect(pixel.coord.x * FACTOR, pixel.coord.y * FACTOR, pixel.width, pixel.height);
    }
  
    // Returns a random pixel on the grid
    function randomPixelOnGrid() {
      return Object.create(Pixel).init({
        x: Math.floor(Math.random() * numCols),
        y: Math.floor(Math.random() * numRows),
        color: FOOD_COLOR
      });
    }
  
    // Checks if the passed in pixel is the food pixel
    function isFoodPixel(pixel) {
      return pixel.coord.equals(foodPixel.coord);
    }
  
    // Checks if the passed in pixel is the obstacle pixel
    function isFirstAnimationFrame() {
      return prevSnakeCoords.length === 0; // If there are no previous snake coordinates then it is the first frame
    }
  
    // Snake movement logic
    // Returns the new position of the snake based on the current position and the move direction
    function newSnakePosition(snakeHeadPosition) {
      var changeInLength = snakeLength - prevSnakeCoords.length;
      var newPosition = prevSnakeCoords.slice(1);
      newPosition.push(snakeHeadPosition);
  
      var lastSnakeCoord = newPosition[0],
        secondLastSnakeCoord = newPosition[1];
  
      if (prevSnakeCoords.length === 1 && changeInLength > 0) {
        if (move === Coord.moveUp) {
          range(changeInLength)
            .forEach((_, i) => newPosition.unshift(Object.create(Coord).init(lastSnakeCoord.x, lastSnakeCoord.y + i + 1)));
        } else if (move === Coord.moveRight) {
          range(changeInLength)
            .forEach((_, i) => newPosition.unshift(Object.create(Coord).init(lastSnakeCoord.x - i - 1, lastSnakeCoord.y)));
        } else if (move === Coord.moveDown) {
          range(changeInLength)
            .forEach((_, i) => newPosition.unshift(Object.create(Coord).init(lastSnakeCoord.x, lastSnakeCoord.y - i - 1)));
        } else if (move === Coord.moveLeft) {
          range(changeInLength)
            .forEach((_, i) => newPosition.unshift(Object.create(Coord).init(lastSnakeCoord.x + i + 1, lastSnakeCoord.y)));
        }
      } else if (prevSnakeCoords.length > 1 && changeInLength > 0) {
        var deltaX = secondLastSnakeCoord.x - lastSnakeCoord.x,
          deltaY = secondLastSnakeCoord.y - lastSnakeCoord.y;
  
        if (deltaY < 0) { // Moving up
          range(changeInLength)
            .forEach((_, i) => newPosition.unshift(Object.create(Coord).init(lastSnakeCoord.x, lastSnakeCoord.y + i + 1)));
        } else if (deltaY > 0) { // Moving down
          range(changeInLength)
            .forEach((_, i) => newPosition.unshift(Object.create(Coord).init(lastSnakeCoord.x, lastSnakeCoord.y - i - 1)));
        } else if (deltaX < 0) { // Moving right
          range(changeInLength)
            .forEach((_, i) => newPosition.unshift(Object.create(Coord).init(lastSnakeCoord.x - i - 1, lastSnakeCoord.y)));
        } else if (deltaX > 0) { // Moving left
          range(changeInLength)
            .forEach((_, i) => newPosition.unshift(Object.create(Coord).init(lastSnakeCoord.x + i + 1, lastSnakeCoord.y)));
        }
      } else if (changeInLength < 0) {
        newPosition.shift();
      }
      return newPosition;
    }
  
    // Checks if the passed in pixel is part of the snake
    function isASnakePixel(pixel, snake) {
      return snake.some(snakePixel => snakePixel.x === pixel.coord.x && snakePixel.y === pixel.coord.y);
    }
  
    // Returns an array of coordinates representing the initial position of the snake
    function initialSnakePosition(headPosition, snakeLength) {
      var startPos = headPosition.x - snakeLength + 1;
      var initialPos = range(snakeLength).map(_ => {
        return Object.create(Coord).init(startPos++, headPosition.y);
      });
      return initialPos;
    }
    
    // Checks if the snake is moving vertically
    function snakeIsMovingVertically() {
      return move === Coord.moveUp || move === Coord.moveDown;
    }
    
    // Checks if the snake is moving horizontally
    function snakeIsMovingHorizontally() {
      return move === Coord.moveRight || move === Coord.moveLeft;
    }
  
    // Utility function to generate a range of numbers
    // Returns an array of integer based on the passed in parameters
    function range(start, stop, step) {
      if (stop == null) {
        stop = start || 0;
        start = 0;
      }
      if (!step) {
        step = stop < start ? -1 : 1;
      }
  
      var length = Math.max(Math.ceil((stop - start) / step), 0);
      var range = new Array(length);
  
      for (var idx = 0; idx < length; idx++, start += step) {
        range[idx] = start;
      }
  
      return range;
    }
  
    // Debounce function
    function debounce(func, wait, immediate) {
      var timeout;
      return function() {
        var context = this,
          args = arguments;
        var later = function() {
          timeout = null;
          if (!immediate) func.apply(context, args);
        };
  
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
      };
    }
  
    // Code execution starts from below here
    init();
  
    // Event listeners
    // For arrow key input / move snake
    window.addEventListener('keydown', (event) => {
      switch (event.key) {
        case 'ArrowLeft':
        case 'q':
          if (snakeIsMovingVertically())
            move = Coord.moveLeft;
          event.preventDefault();
          break;
        case 'ArrowUp':
        case 'z':
          if (snakeIsMovingHorizontally())
            move = Coord.moveUp;
          event.preventDefault();
          break;
        case 'ArrowRight':
        case 'd':
          if (snakeIsMovingVertically())
            move = Coord.moveRight;
          event.preventDefault();
          break;
        case 'ArrowDown':
        case 's':
          if (snakeIsMovingHorizontally())
            move = Coord.moveDown;
          event.preventDefault();
          break;
        default:
          // Ignore
          break;
      };
    });

    // For space key input / activate shield
    window.addEventListener('keydown', function(event) {
      // Check if the 'space' key is pressed
      if (event.key === ' ') {
      activateShield();
      }
    });  
    
})();