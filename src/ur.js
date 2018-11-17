const DEBUG = false;

class Ur {
  constructor({ getMove, turnFinished, gameOver, removedToken, scored }) {
    this.callbacks = {
      getMove: getMove,
      turnFinished: turnFinished,
      gameOver: gameOver,
      removedToken: removedToken,
      scored: scored
    };

    this.random = Math.random;

    this.tracks = [null, [], []];
    this.available = [ null, 7, 7 ];
    this.score = [ null, 0, 0 ];
    this.winner = UrPlayer.NONE;

    for (var i = 0; i < 4; i++) {
      this.tracks[UrPlayer.PLAYER1].push(new UrSpace([ UrPlayer.PLAYER1 ], i));
      this.tracks[UrPlayer.PLAYER2].push(new UrSpace([ UrPlayer.PLAYER2 ], i));
    }
    for (var i = 4; i < 12; i++) {
      let sharedSpace = new UrSpace([ UrPlayer.PLAYER1, UrPlayer.PLAYER2 ], i);
      this.tracks[UrPlayer.PLAYER1].push(sharedSpace);
      this.tracks[UrPlayer.PLAYER2].push(sharedSpace);
    }
    for (var i = 12; i < 14; i++) {
      this.tracks[UrPlayer.PLAYER1].push(new UrSpace([ UrPlayer.PLAYER1 ], i));
      this.tracks[UrPlayer.PLAYER2].push(new UrSpace([ UrPlayer.PLAYER2 ], i));
    }

    this.turn = UrPlayer.NONE;

    this.grid = [
      [ this.tracks[UrPlayer.PLAYER1][3],  this.tracks[UrPlayer.PLAYER1][4],  this.tracks[UrPlayer.PLAYER2][3] ],
      [ this.tracks[UrPlayer.PLAYER1][2],  this.tracks[UrPlayer.PLAYER1][5],  this.tracks[UrPlayer.PLAYER2][2] ],
      [ this.tracks[UrPlayer.PLAYER1][1],  this.tracks[UrPlayer.PLAYER1][6],  this.tracks[UrPlayer.PLAYER2][1] ],
      [ this.tracks[UrPlayer.PLAYER1][0],  this.tracks[UrPlayer.PLAYER1][7],  this.tracks[UrPlayer.PLAYER2][0] ],
      [ null,                              this.tracks[UrPlayer.PLAYER1][8],  null ],
      [ null,                              this.tracks[UrPlayer.PLAYER1][9],  null ],
      [ this.tracks[UrPlayer.PLAYER1][13], this.tracks[UrPlayer.PLAYER1][10], this.tracks[UrPlayer.PLAYER2][13] ],
      [ this.tracks[UrPlayer.PLAYER1][12], this.tracks[UrPlayer.PLAYER1][11], this.tracks[UrPlayer.PLAYER2][12] ],
    ];
  }

  doTurn(extraRoll) {
    if (!this.playing()) {
      throw new Error('The game has not started yet');
    }

    const rollResult = this.roll();

    const handleMove = move => {
      if (move.action === UrAction.FORFEIT) {
        this.switchPlayer();
        this.winner = this.turn;
        this.callbacks.gameOver(this.winner);
      } else if (move.action === UrAction.PASS) {
        this.switchPlayer();
        this.callbacks.turnFinished();
      } else if (move.action == UrAction.MOVE) {
        const to = move.from + rollResult;
        if (this.canMove(move.from, to)) {
          const rollAgain = this.move(move.from, to);
          if (this.gameOver()) {
            this.winner = this.turn;
            this.turn = UrPlayer.NONE;
            this.callbacks.gameOver(this.winner);
          }
          if (rollAgain) {
            this.doTurn(true);
          } else {
            this.switchPlayer();
            this.callbacks.turnFinished();
          }
        } else {
          this.callbacks.getMove(this.turn, rollResult, false, handleMove);
        }
      }
    };

    this.callbacks.getMove(this.turn, rollResult, extraRoll, handleMove);
  }

  gameOver() {
    return this.winner || this.score[this.turn] === 7;
  }

  playing() {
    return this.turn !== UrPlayer.NONE;
  }

  start() {
    this.turn = UrPlayer.PLAYER1;
  }

  roll() {
    return this.flip() + this.flip() + this.flip() + this.flip();
  }

  flip() {
    return this.random() < 0.5 ? 0 : 1;
  }

  possibleMoves(roll) {
    let moves = [];
    if (roll === 0) {
      return moves;
    }
    for (let i = -1; i < 14; i++) {
      if (this.canMove(i, i + roll)) {
        moves.push(i);
      }
    }
    return moves;
  }

  canMove(from, to) {
    if (!this.playing()) {
      return false;
    }

    if (from < -1 || from > 13 || to < 0 || to > 14) {
      if (DEBUG) { console.log('Index out of bounds'); }
      return false;
    }

    const track = this.tracks[this.turn];

    let fromOccupied = false;
    if (from === -1) {
      fromOccupied = this.available[this.turn] > 0;
      if (DEBUG && !fromOccupied) {
        console.log('No more pieces');
      }
    } else {
      fromOccupied = (track[from].piece === this.turn);
      if (DEBUG && !fromOccupied) {
        console.log('No piece to move from there');
      }
    }

    if (!fromOccupied) {
      return false;
    }

    if (to === 14) {
      return true;
    }

    return track[to].availableForPlayer(this.turn);
  }

  move(from, to) {
    if (!this.canMove(from, to)) {
      throw new Error('Illegal move!');
    }

    const track = this.tracks[this.turn];

    if (from === -1) {
      --this.available[this.turn];
    } else {
      track[from].clear();
    }

    if (to === 14) {
      ++this.score[this.turn];
      this.callbacks.scored(this.turn);
    } else {
      let replaced = track[to].setPiece(this.turn);
      if (replaced !== UrPlayer.NONE) {
        ++this.available[replaced];
        this.callbacks.removedToken(this.turn, replaced, to);
      }
      return track[to].isRosette();
    }

    return false;
  }

  switchPlayer() {
    if (this.turn === UrPlayer.PLAYER1) {
      this.turn = UrPlayer.PLAYER2;
    } else {
      this.turn = UrPlayer.PLAYER1;
    }
  }

  renderToString(withIndexes) {
    const prefix = (rowIndex) => {
      return rowIndex === 3 ? `| ${this.available[UrPlayer.PLAYER1] || ' '} ` : '|   ';
    };

    const suffix = (rowIndex) => {
      return rowIndex === 3 ? ` ${this.available[UrPlayer.PLAYER2] || ' '} |` : '   |';
    };

    let grid = this.grid.map((row, rowIndex) => prefix(rowIndex) + row.map(space => {
      if (!space) {
        return '     ';
      } else {
        return space.renderToString(!!withIndexes, this.turn);
      }
    }).join('') + suffix(rowIndex)).join('\n');

    const p1Turn = (this.turn === UrPlayer.PLAYER1 ? '>' : ' ');
    const p2Turn = (this.turn === UrPlayer.PLAYER2 ? '>' : ' ');
    const p1Winner = this.winner === UrPlayer.PLAYER1 ? '*' : ' ';
    const p2Winner = (this.winner === UrPlayer.PLAYER2 ? '*' : ' ');
    return [
      `+${'-'.repeat(21)}+`,
      `|${' '.repeat(21)}|`,
      `|   ${p1Turn}P1${p1Winner}       ${p2Turn}P2${p2Winner}   |`,
      `|   [ ${this.score[UrPlayer.PLAYER1]}]       [ ${this.score[UrPlayer.PLAYER2]}]   |`,
      `|${' '.repeat(21)}|`,
      grid,
      `|${' '.repeat(21)}|`,
      `+${'-'.repeat(21)}+`
    ].join('\n');
  }
}

const UrPlayer = {
  NONE: 0,
  PLAYER1: 1,
  PLAYER2: 2
};

const UrAction = {
  PASS: 'pass',
  MOVE: 'move',
  FORFEIT: 'forfeit'
};

const TOKEN = [ ' ', 'X', 'O' ];

class UrSpace {
  constructor(players, index) {
    this.players = players;
    this.index = index;
    this.piece = UrPlayer.NONE;
  }

  validForPlayer(player) {
    return this.players.includes(player);
  }

  occupied() {
    return this.piece !== UrPlayer.NONE;
  }

  availableForPlayer(player) {
    return this.validForPlayer(player) && (this.isRosette() ? this.piece === UrPlayer.NONE : this.piece !== player);
  }

  setPiece(player) {
    if (!this.validForPlayer(player)) {
      throw new Error('Illegal move!');
    }
    let oldPiece = this.piece;
    this.piece = player;
    return oldPiece;
  }

  clear() {
    this.piece = UrPlayer.NONE;
  }

  isRosette() {
    return this.index === 3 || this.index === 7 || this.index === 13;
  }

  gridIndex() {
    let column = 1;
    if (this.validForPlayer(UrPlayer.PLAYER1)) {
      --column;
    }
    if (this.validForPlayer(UrPlayer.PLAYER2)) {
      ++column;
    }

    let row = 0;
    if (this.index <= 3) {
      row = 3 - this.index;
    } else if (this.index >= 12) {
      row = 19 - this.index;
    } else {
      row = this.index - 4;
    }

    return [ row, column ];
  }

  renderToString(withIndexes, turn) {
    const token = pad(2, (withIndexes && this.piece === turn) ? (this.index + 1) : TOKEN[this.piece]);
    return this.isRosette() ? `(${token}*)` : `[${token} ]`;
  }
}

function pad(n, s) {
  let padded = String(s);
  while (padded.length < n) {
    padded = ' ' + padded;
  }
  return padded;
}

exports.Ur = Ur;
exports.UrPlayer = UrPlayer;
exports.UrSpace = UrSpace;
exports.UrAction = UrAction;
