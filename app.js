//
//  copyright (c) gordon anderson justgord@gmail.com 2013 
//
//  released under MIT and BSD open source licence    
//
//  reuses Creative Commons licensed vector graphics for chess pieces, see wikipedia
//


function clog(s)
{
    console.log(s);
}

function jlog(ob)
{
    clog(JSON.stringify(ob, "    ",null));
}

function divcl(sclass)
{
    var dv = $("<div/>");
    if (sclass)
        dv.addClass(sclass);
    return dv;
}

var fen_new_game = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";


var fen_puzzles = 
[
    "1BR1KRB1/8/8/8/8/8/8/rk1bb2r w - - 0 1",                           // paul rooks-n-bishops
    "2k2r2/r7/3n2B1/6B1/4P3/4P3/8/5K2 w - - 0 1",                       // crazy setup  
    "kn6/b1Ppp3/PpPpP1p1/1P1prb2/4B1P1/7P/2N3N1/R3K2R w KQ - 0 1",      // Die Schwalbe, No. 9444, 12/1996
    "5r2/8/1R6/ppk3p1/2N3P1/P4b2/1K6/5B2 w - - 0 1",                    // GM afec 1972
    "1q2k2r/1p1nb1pp/p3N1b1/N3p1P1/r7/2Q1B3/PPP5/2KR1R2 w - - 0 1",     // 2012
    "rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
    "4k3/8/8/8/8/8/4P3/4K3 w - - 5 39",
    "4k3/8/8/8/2p5/8/3P4/5K2 w",                                        // en passant
    "r5rk/5p1p/5R2/4B3/8/8/7P/7K w",                                    // w mate in 3
    "5B2/6P1/1p6/8/1N6/kP6/2K5/8 w",                                    // 
    "3n2nr/4Pqpp/2k5/8/8/8/2B3PP/6K1 w - - 0 1",                        //
    "r1bq2r1/b4pk1/p1pp1p2/1p2pP2/1P2P1PB/3P4/1PPQ2P1/R3K2R w -"        // white in 2
];

var W=60;

var move=null;

var moves = [];

var positions;

var w;
var b;


function move_code()
{
    //jlog(move);

    function nam(pc)
    {
        var c=pc[1];
        if (c=="p")
            return "";
        return c.toUpperCase();
    }

    function sfrom()
    {
        // show rank, file if source piece is ambiguous

        var bSibling=false;
        var bSiblingFile=false;

        for (var i=0;i<8;i++)
        {
            for (var j=0;j<8;j++)
            {
                var sq = alpha(i,j);
                var pc = positions[sq];
                if (pc && pc==move.pc && sq!=move.from)
                {
                    var mv = {"pc":pc, "from":sq,"to":move.to};

                    if (check_move(mv))
                    {
                        bSibling=true;
                        if (sq[0]==move.from[0])
                        {
                            bSiblingFile=true;
                        }
                    }
                }
            }
        }
        
        var n = nam(move.pc);
        if (bSiblingFile)
            return n + move.from;           // show file and rank
        if (bSibling)
            return n + move.from[0];        // show file
        return n;                           // show neither
    }

    if (move.castle)
    {
        if (move.castle=="g1" || move.castle=="g8")
            return "O-O";
        else
            return "O-O-O";
    }

    var s = sfrom();
    if (move.take)
        s += "x";
    s += move.to;

    return s;
}

function check_pawn(v, mv)
{
    var yok;

    if (whose_move()=='b')
    {
        yok = (v.y==-1);
        if (parseInt(mv.from[1])==7)
            yok = yok || (v.y==-2);
    }
    else
    {
        yok = (v.y==1);
        if (parseInt(mv.from[1])==2)
            yok = yok || (v.y==2);
    }

    if (!yok)
        return false;

    var dx = Math.abs(v.x);

    return move.take ? dx==1 : dx==0; 
}

function check_rook(v)
{
    return v.x==0 || v.y==0;
}

function check_knight(v)
{
    var dx = Math.abs(v.x);
    var dy = Math.abs(v.y);
    return ((dx==1 && dy==2) || (dx==2 && dy==1));
}

function check_bishop(v)
{
    var dx = Math.abs(v.x);
    var dy = Math.abs(v.y);
    return (dx==dy);
}

function check_king(v, mv)
{
    var dx = Math.abs(v.x);
    var dy = Math.abs(v.y);

    var col = mv.pc[0];

    if (col=='w' && !w.moved.e1 && dy==0 && dx==2) 
    {
        if (v.x==2 && !w.moved.h1 && check_path_clear(coords("e1"), coords("h1"), {x:3,y:0}))
        {
            mv.castle="g1";    
            return true;
        }
        if (v.x==-2 && !w.moved.a1 && check_path_clear(coords("e1"), coords("a1"), {x:-4,y:0}))
        {
            mv.castle="c1";    
            return true;
        }
    }

    if (col=='b' && !b.moved.e8 && dy==0 && dx==2) 
    {
        if (v.x==2 && !b.moved.h8 && check_path_clear(coords("e8"), coords("h8"), {x:3,y:0}))
        {
            mv.castle="g8";    
            return true;
        }
        if (v.x==-2 && !b.moved.a8 && check_path_clear(coords("e8"), coords("a8"), {x:-4,y:0}))
        {
            mv.castle="c8";    
            return true;
        }
    }

    return (dx<2 && dy<2)
}

function check_queen(v)
{
    return check_rook(v) || check_bishop(v);
}

function coords(sq)
{
    var c = {};
    c.x = parseInt(sq[0],26)-10;        // "a"->0, "b"->1 ...
    c.y = parseInt(8-sq[1]);
    return c;
}

function alpha(i,j)
{
    var abc = 'abcdefgh';
    return abc[i%8]+(8-j);
}


function check_path_clear(cfr, cto, v)
{
    function sign(x)
    {
        if (x==0)
            return 0;
        return x<0 ? -1 : 1;
    }

    var dx = sign(v.x);
    var dy = -1*sign(v.y);

    var n=(dx==0) ? Math.abs(v.y) : Math.abs(v.x);

    var cp = {"x":cfr.x,"y":cfr.y};

    for(var i=0;i<(n-1);i++)
    {
        cp.x+=dx;
        cp.y+=dy;

        var sqc = alpha(cp.x,cp.y);

        if (positions[sqc])
        {
            //clog('obstacle at '+sqc);
            return false;
        }
    }

    return true; 
}

function check_check(mv)
{
    var col=mv.pc[0];

    return true; 
}

function check_move(mv)
{
    function relative_movement(c1, c2)
    {
        var cv={};
        cv.x = c2.x-c1.x;
        cv.y = c1.y-c2.y;
        return cv;
    }
    var checks = 
    {
        "p":check_pawn,
        "r":check_rook,
        "n":check_knight,
        "b":check_bishop,
        "k":check_king,
        "q":check_queen,
    }

    var cfr=coords(mv.from);
    var cto=coords(mv.to);

    var v = relative_movement(cfr, cto);
    var t = mv.pc[1];
    var check=checks[t];

    if (!check(v, mv))
        return false;

    var ok = t=='n' || t=='k' || check_path_clear(cfr, cto, v);

    if (ok)
        check_check(mv);

    return ok;
}

function show_move(code)
{
    divcl('move-code').html(code).appendTo('.move-list-'+whose_move());
    $(".move-list")[0].scrollTop=50000;
}

function do_move()
{
    var code = move_code();

    show_move(code);
    moves.push(code);

    function show_move_board(mv)
    {
        var sqfr=$("#"+mv.from);
        var sqto=$("#"+mv.to);

        sqfr.removeClass("moving");

        sqfr.removeClass(mv.pc);
        sqto.addClass(mv.pc);
        if (mv.take)
            sqto.removeClass(mv.take);

        delete positions[mv.from];
        positions[mv.to]=mv.pc;
    }

    show_move_board(move);

    // move rook also, if castling

    if (move.castle=="c1")
        show_move_board({pc:"wr",from:"a1",to:"d1"});
    if (move.castle=="g1")
        show_move_board({pc:"wr",from:"h1",to:"f1"});
    if (move.castle=="c8")
        show_move_board({pc:"br",from:"a8",to:"d8"});
    if (move.castle=="g8")
        show_move_board({pc:"br",from:"h8",to:"f8"});

    // remember moves that prevent castling

    var flag_moves = ["a1","e1","h1",  "a8","e8","h8"];

    if (_.contains(flag_moves, move.from))
    {
        if (move.pc[0]=="w")
            w.moved[move.from]=1;
        else
            b.moved[move.from]=1;
    }

    move=null;
}

function whose_move()
{
    var col = (moves.length%2) ? 'b' : 'w';
    return col;
}

function click_square() 
{
    var dvsq = $(this);
    var sq = dvsq.attr('id');    

    var pc = positions[sq];

    var col_turn = whose_move();

    // move start

    if (!move && pc && col_turn==pc[0])
    {
        move = { "pc":pc, "from":sq };
        dvsq.addClass("moving");
    }
    if (!move)
        return;

    // move started

    if(pc && move.pc[0]==pc[0])
    {
        // clicked own color, restart move

        $("#"+move.from).removeClass("moving");
        move = { "pc":pc, "from":sq };
        dvsq.addClass("moving");
    }
    else
    {
        // end move

        move["to"]=sq;
        if (pc)
            move["take"]=pc;

        if (check_move(move))
            do_move();
    }
}

function clear_board()
{
    $(".board").empty().remove();
    $(".move-list").remove();

    positions = [];
    moves = [];
    move = null;
    w={};
    b={};
    w.moved={};
    b.moved={};

    var dvml = divcl('move-list')
        .append(divcl('move-list-w'))
        .append(divcl('move-list-b'));

    $("body")
        .append(dvml);

    divcl('move-header').html('White').appendTo('.move-list-w');
    divcl('move-header').html('Black').appendTo('.move-list-b');
}

function draw_board()
{
    var dvbd = divcl("board");
    for (var j=0;j<8;j++)
    {
        var dvr = divcl('row');
        for (var i=0;i<8;i++)
        {
            var id = alpha(i,j);

            var bw = (i+j)%2;

            var dvsq = divcl('square')
                .addClass(bw ? 'black' : 'white')
                .css('left', i*W)
                .css('top', j*W)
                .attr('id', id);

            dvsq.on(tapevent, click_square);

            var pc = positions[id];
            if (pc)
                dvsq.addClass(pc);

            dvr.append(dvsq);
        }
        dvbd.append(dvr);
    }

    $("body")
        .append(dvbd)
}

var bntop=10;
function button(stitle, action)
{
    divcl('button')
        .css('top',bntop)
        .on(tapevent ,action)
        .html(stitle)
        .appendTo("body");
    bntop+=32;
}

function fen_load(sfen)
{
    var x=0,y=0;
    var fen = sfen.split(' ');
    var fbd = fen[0].split('/');

    if (fen[1]=='b')
    {
        var code='...';
        show_move(code);
        moves.push(code);
    }

    for (var j in fbd)
    {
        var sln = fbd[j];

        for (var i in sln)
        {      
            var c = sln[i];
            var w = c==c.toUpperCase() ? 'w' : 'b';
            var p = c.toLowerCase();
            if (c>='0' && c<='8') 
            {
                x+=parseInt(c);
            }
            else if ("prnbkq".indexOf(p)>=0)
            {
                var pc = w+p;
                var sq = alpha(x,y);

                positions[sq] = pc;
                x++;
            }
            else
            {
                clog('fen : unknown c at i='+i);
                x++;
            }
        }
        x=0;
        y++;
    }
}

var npuzzle=0;
function next_puzzle()
{
    clear_board();
    var sfen = fen_puzzles[npuzzle++%fen_puzzles.length];
    fen_load(sfen);
    draw_board();
}

function new_game()
{
    clear_board();
    fen_load(fen_new_game);
    draw_board();
}


var tapevent = 'click';

$(document).ready(function(){

    tapevent = (typeof Touch == "object") ? "touchstart" : "mousedown";

    new_game();

    button("New Game",      new_game);
    button("New Puzzle",    next_puzzle);
});
