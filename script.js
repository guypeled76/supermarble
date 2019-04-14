
class BoardCell {
    
    constructor(board, y, x, backgroundImg, marbleImg) {
        this.y = y;
        this.x = x;
        this.board = board;
        this.backgroundImg = backgroundImg;
        this.marbleImg = marbleImg;

        this.occupied = false;

        marbleImg.draggable = true;

        this.attach(this.marbleImg, "click", this.dragstart)
        this.attach(this.backgroundImg, "click", this.drop)

        this.attach(this.marbleImg, "dragstart", this.dragstart)
        this.attach(this.marbleImg, "dragend", this.dragend)

        this.attach(this.backgroundImg, "dragover", this.over)
        this.attach(this.backgroundImg, "drop", this.drop)
    }

    attach(element, event, handler) {
        var me = this;
        element.addEventListener(event, function(e) {
            handler.bind(me)(e);
        }, false);
    }

    canJump(other) {
        var d = (Math.abs(this.x - other.x) + Math.abs(this.y - other.y));
        return d==2 || d==4;
    }

    dragstart(event) {
        this.board.pushDragged(this);
    }

    dragend(event) {
        this.board.popDragged();
    }

    over(event) {
        event.preventDefault();
    }

    drop(event) {
        event.preventDefault();

        var dragged = this.board.popDragged();
        if(dragged == null) {
            return null;
        }

        if(!dragged.canJump(this)) {
            return null;
        }

        if(!this.isEmpty()) {
            return null;
        }

        var skipped = this.board.getItem((this.x + dragged.x)/2, (this.y + dragged.y)/2);
        if(skipped==null){
            return null;
        }

        if(skipped.isEmpty()){
            return null;
        }

        var current = this;
        skipped.empty();
        dragged.empty();
        current.occupy();

        this.board.addHistory(function(){
            skipped.occupy();
            dragged.occupy();
            current.empty();
        });

        
        this.checkStatus();
    }

    checkStatus() {
        var me = this;
        window.setTimeout(function() {
            me.board.checkStatus(me);
        }, 1);
    }


    occupy() {
        if(this.occupied) {
            return;
        }
        this.occupied = true;
        this.marbleImg.style.display = 'block';
        this.board.addOccupiedCell(this);
    }

    empty() {
        if(!this.occupied) {
            return;
        }
        this.occupied = false;
        this.marbleImg.style.display = 'none';
        this.board.removeOccupiedCell(this);
    }

    isEmpty() {
        return !this.occupied;
    }

    playReverse(dx, dy) {
        if(this.isEmpty()){
            return false;
        }

        var firstCell = this.board.getItem(this.x + dx, this.y + dy);
        if(!firstCell.isEmpty()){
            return false;
        }

        var secondCell = this.board.getItem(this.x + dx * 2, this.y + dy * 2);
        if(!secondCell.isEmpty()){
            return false;
        }

        this.empty();
        firstCell.occupy();
        secondCell.occupy();
        return true;
    }
}

class Board {

    constructor(height, width, size, marbles) {
        this.marbles = marbles;
        this.size = size;
        this.height = height;
        this.width = width;
        this.dragged = null;
        this.history = [];
        this.occupiedCells = [];
        this.directions = [
            [-1,0],[-1,-1],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1]
        ];

        this.special_x =  Math.floor(this.width / 2);
        this.special_y =  Math.floor(this.height / 2);

        this.normal = "resources/thehole.png";
        this.special = "resources/hole.png";
        this.marble = "resources/marble.png";
    }

    addOccupiedCell(cell) {
        this.occupiedCells.push(cell);
    }

    removeOccupiedCell(cell) {
        this.occupiedCells = this.occupiedCells.filter(function(current){
            return current != cell;
        });
    }

    count() {
        return this.occupiedCells.length;
    }

    addHistory(rollbackFunc) {
        this.history.push(rollbackFunc);
    }

    undo() {
        var rollbackFunc = this.history.pop();
        if(rollbackFunc == null){
            alert("no history");
            return;
        }

        rollbackFunc();
    }

    reset() {
        while(this.history.length > 0) {
            this.undo();
        }
    }

    checkStatus(current) {
        if(this.count() != 1) {
            return;
        }

        if(this.special_x == current.x && this.special_y == current.y) {
            alert("you win");
            this.history = [];
            this.marbles++;
            this.generateLevel();
        } else {
            alert("you loose");
        }
    }

    pushDragged(cell) {
        this.dragged = cell;
    }

    popDragged() {
        var temp = this.dragged;
        this.dragged = null;
        return temp;
    }

    getItem(x,y) {
        if(y < 0 || x < 0) {
            return null;
        }
        
        if(y>=this.state.length) {
            return null;
        }
        var row = this.state[y];

        if(x>=row.length) {
            return null;
        }
        return row[x];
    }

    rand(max) {
        var r = Math.random();
        console.log("rand is ", r, " max is ", max);
        return Math.floor(r*max);
    }

    init(element) {
        this.state = new Array(this.height);
        for(var y=0;y<this.height;y++) {
            this.state[y] = new Array(this.width);
            for(var x=0;x<this.width;x++) {
                var isSpecial = x ==this.special_x && y == this.special_y;
                var cell = new BoardCell(
                    this,
                    y, x,
                    this.createImage(element, y,x, isSpecial ? this.special : this.normal, true),
                    this.createImage(element, y,x, this.marble, false)
                );
                this.state[y][x] = cell;

                if(isSpecial) {
                    cell.occupy();
                }
            }
        }

        this.generateLevel();
        
    }

    generateLevel() {
        console.log("generate", this.marbles);
        var tries = 0;
        var marbles_to_add = this.marbles;

        while(marbles_to_add > 0) {

            if(tries > 100) {
                console.log("Tried 100 times and failed.");
                return;
            }
            var currentCell = this.getRandomCell();
            if(currentCell==null) {
                console.log("could not get occupied cell.");
                return;
            }

            var [dx,dy] = this.directions[this.rand(this.directions.length)];
            if(currentCell.playReverse(dx,dy)) {
                marbles_to_add--;
                tries = 0;
            } else {
                tries++;
            }
        }
    }

    getRandomCell() {
        var index = this.rand(this.occupiedCells.length);
        var cell = this.occupiedCells[index];
        return cell;
    }


    createImage(element, y, x, src, visible) {
        var img = document.createElement("img");
        img.style.position = "absolute";
        img.style.top = (y * this.size) + "px";
        img.style.left = (x * this.size) + "px";
        img.style.width = this.size + "px";
        img.style.height = this.size + "px";
        if(!visible) {
            img.style.display = "none";
        }
        img.src = src;
        element.appendChild(img);
        return img;
    }

    

}

