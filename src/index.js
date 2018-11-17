const { Ur, UrAction } = require('./ur');

const game = new Ur({
  getMove(player, roll, extraRoll, callback) {
    function promptForMove() {
      let canPass = false;
      const moves = game.possibleMoves(roll);
      const options = [];
      if (moves.length === 0) {
        options.unshift('[P]ass');
        canPass = true;
      }
      if (moves[0] === -1) {
        options.unshift('[A]dd a token');
        moves.shift();
      }
      if (moves.length === 1) {
        options.unshift(`move the token at ${moves[0] + 1}`);
      } else if (moves.length > 1) {
        options.unshift(`move the token at [${moves.map(i => i + 1).join('/')}]`);
      }

      const haveOptions = options.length > 1;
      const optionsList = oxfordList(options, 'or');
      prompt(`Player ${player}, you rolled a ${roll}. ${haveOptions ? 'Your options are:' : 'You have to'} ${optionsList}\n`, command => {
        switch (command.toUpperCase()) {
          case 'P':
            if (canPass) {
              callback({ action: UrAction.PASS });
            } else {
              console.log(`You have moves available, so you cannot pass.`);
              promptForMove();
            }
            break;
          case 'F':
          case 'Q':
            prompt('Are you sure you want to forfeit? ', answer => {
              if (/^y/i.test(answer)) {
                console.log(`Player ${player} has forfeited.`);
                callback({ action: UrAction.FORFEIT });
              } else {
                promptForMove();
              }
            });
            break;
          case 'A':
            callback({ action: UrAction.MOVE, from: -1 });
            break;
          case '':
            promptForMove();
            break;
          default:
            const from = parseInt(command);
            if (isNaN(from) || from < 1 || from > 14) {
              console.log('Invalid move');
              promptForMove();
            } else {
              callback({ action: UrAction.MOVE, from: from - 1 });
            }
            break;
        }
      });
    }

    if (extraRoll) {
      console.log(game.renderToString(true));
      console.log(`Player ${player} landed on a rosette space and gets to roll again!`);
    }
    promptForMove();
  },

  turnFinished() {
    console.log(game.renderToString(true));
    game.doTurn();
  },

  gameOver(winner) {
    console.log(`Player ${winner} is the winner!`);
    console.log(game.renderToString());
    process.exit(0);
  },

  removedToken(player, other, index) {
    console.log(`Player ${player} has removed Player ${other}'s piece!`);
  },

  scored(player) {
    console.log(`Player ${player} has scored!`);
  }
});

game.start();
console.log(game.renderToString());
game.doTurn();

function oxfordList(list, conjunction) {
  if (list.length === 0) {
    return '';
  } else if (list.length === 1) {
    return list[0];
  } else if (list.length === 2) {
    return list.join(` ${conjunction} `);
  } else {
    return list.slice(0, list.length - 1).join(', ') + `, ${conjunction} ` + list[list.length - 1];
  }
}

function prompt(question, callback) {
  var stdin = process.stdin;
  var stdout = process.stdout;

  stdin.resume();
  stdout.write(question);

  stdin.once('data', function (data) {
    callback(data.toString().trim());
  });
}
