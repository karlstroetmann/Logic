// visuals.fsx
//
// Functions for displaying the solutions of puzzles graphically.  They replace
// the Python packages `chess_problem_visuals` and `problem_visuals` that are used
// in the Python notebooks.  The functions return HTML content, which is rendered
// by the notebook when it is the value of the last expression of a cell.
//
// The script is loaded via
//
//     #load "../visuals.fsx"

[<AutoOpen>]
module Visuals

open Microsoft.AspNetCore.Html

/// `chessBoard n queens width` returns an HTML table showing an n x n chess board.
///   - `n` is the size of the board,
///   - `queens` is a list of pairs (row, col) specifying the positions of queens,
///     where rows and columns are numbered starting from 1, and row 1 is the top row,
///   - `width` is the width of the board as a CSS length, e.g. "50%" or "400px".
let chessBoard (n: int) (queens: (int * int) list) (width: string) : IHtmlContent =
    let occupied = Set.ofList queens
    let sb = System.Text.StringBuilder()
    sb.Append(sprintf "<table style=\"border-collapse:collapse; width:%s; table-layout:fixed; border:2px solid #333\">" width) |> ignore
    for row in 1 .. n do
        sb.Append("<tr>") |> ignore
        for col in 1 .. n do
            let colour = if (row + col) % 2 = 0 then "#f0d9b5" else "#b58863"
            let piece  = if occupied.Contains (row, col) then "♛" else ""
            sb.Append(sprintf "<td style=\"background:%s; color:black; aspect-ratio:1; padding:0; text-align:center; font-size:min(3vw, 32px); border:none\">%s</td>" colour piece) |> ignore
        sb.Append("</tr>") |> ignore
    sb.Append("</table>") |> ignore
    HtmlString(sb.ToString()) :> IHtmlContent

/// `sudokuGrid puzzle solution width` returns an HTML table showing a Sudoku.
///   - `puzzle` is a 9 x 9 array of digits, where 0 denotes an empty field,
///   - `solution` is a map assigning digits to positions (row, col), where rows and
///     columns are numbered from 1 to 9.  Digits from the solution are shown in
///     blue, the digits given in the puzzle are shown in black.
///   - `width` is the width of the grid as a CSS length, e.g. "50%" or "400px".
let sudokuGrid (puzzle: int[][]) (solution: Map<int * int, int>) (width: string) : IHtmlContent =
    let sb = System.Text.StringBuilder()
    sb.Append(sprintf "<table style=\"border-collapse:collapse; width:%s; table-layout:fixed; border:3px solid black\">" width) |> ignore
    for row in 1 .. 9 do
        sb.Append("<tr>") |> ignore
        for col in 1 .. 9 do
            let right  = if col % 3 = 0 then "3px" else "1px"
            let bottom = if row % 3 = 0 then "3px" else "1px"
            let given  = puzzle[row - 1][col - 1]
            let text, colour =
                if given <> 0 then string given, "black"
                else
                    match solution.TryFind (row, col) with
                    | Some d -> string d, "#1565c0"
                    | None   -> "", "black"
            sb.Append(sprintf "<td style=\"background:white; color:%s; aspect-ratio:1; padding:0; text-align:center; font-size:min(3vw, 28px); font-weight:%s; border:1px solid #999; border-right:%s solid black; border-bottom:%s solid black\">%s</td>"
                              colour (if given <> 0 then "bold" else "normal") right bottom text) |> ignore
        sb.Append("</tr>") |> ignore
    sb.Append("</table>") |> ignore
    HtmlString(sb.ToString()) :> IHtmlContent

/// `australiaMap colours width` returns an SVG image showing a schematic map of
/// the seven states of Australia.
///   - `colours` is a map assigning colours to some of the states.  The states are
///     named "WA", "NT", "SA", "Q", "NSW", "V", and "T".  The colours are CSS colour
///     names like "red".  States without a colour are shown in light gray.
///   - `width` is the width of the image as a CSS length, e.g. "50%" or "400px".
let australiaMap (colours: Map<string, string>) (width: string) : IHtmlContent =
    // the states as polygons together with the position of their label
    let states =
        [ "WA",  "10,60 150,40 150,300 60,320 10,250",                       (80, 180)
          "NT",  "150,40 250,30 250,180 150,180",                            (200, 110)
          "SA",  "150,180 270,180 270,320 210,300 150,300",                  (210, 245)
          "Q",   "250,30 300,40 390,170 380,220 270,220 270,180 250,180",    (320, 150)
          "NSW", "270,220 380,220 360,300 290,300 270,290",                  (320, 260)
          "V",   "270,290 290,300 360,300 330,330 270,320",                  (305, 314)
          "T",   "300,345 340,345 330,375 305,375",                          (320, 362) ]
    let sb = System.Text.StringBuilder()
    sb.Append(sprintf "<svg viewBox=\"0 0 400 385\" style=\"width:%s; background:#e3f2fd\" xmlns=\"http://www.w3.org/2000/svg\">" width) |> ignore
    for (name, points, (x, y)) in states do
        let colour = defaultArg (colours.TryFind name) "#dddddd"
        sb.Append(sprintf "<polygon points=\"%s\" fill=\"%s\" stroke=\"black\" stroke-width=\"2\"/>" points colour) |> ignore
        sb.Append(sprintf "<text x=\"%d\" y=\"%d\" text-anchor=\"middle\" font-family=\"sans-serif\" font-size=\"16\" fill=\"black\">%s</text>" x y name) |> ignore
    sb.Append("</svg>") |> ignore
    HtmlString(sb.ToString()) :> IHtmlContent

/// `knightsTour n path width` returns an SVG image showing the path of a knight
/// on an n x n chess board.
///   - `n` is the size of the board,
///   - `path` is the list of the positions (row, col) visited by the knight, in
///     the order in which they are visited.  Rows and columns are numbered
///     starting from 0, and row 0 is the top row.
///   - `width` is the width of the image as a CSS length, e.g. "50%" or "400px".
/// Every square shows the number of the move that leads to this square.
let knightsTour (n: int) (path: (int * int) list) (width: string) : IHtmlContent =
    let size = 50
    let centre k = k * size + size / 2
    let sb = System.Text.StringBuilder()
    sb.Append(sprintf "<svg viewBox=\"0 0 %d %d\" style=\"width:%s\" xmlns=\"http://www.w3.org/2000/svg\">" (n * size) (n * size) width) |> ignore
    for row in 0 .. n - 1 do
        for col in 0 .. n - 1 do
            let colour = if (row + col) % 2 = 0 then "#f0d9b5" else "#b58863"
            sb.Append(sprintf "<rect x=\"%d\" y=\"%d\" width=\"%d\" height=\"%d\" fill=\"%s\"/>" (col * size) (row * size) size size colour) |> ignore
    let points = path |> List.map (fun (row, col) -> sprintf "%d,%d" (centre col) (centre row)) |> String.concat " "
    sb.Append(sprintf "<polyline points=\"%s\" fill=\"none\" stroke=\"darkblue\" stroke-width=\"2\" opacity=\"0.7\"/>" points) |> ignore
    for (k, (row, col)) in List.indexed path do
        let fill = if k = 0 then "darkred" else "darkblue"
        sb.Append(sprintf "<circle cx=\"%d\" cy=\"%d\" r=\"11\" fill=\"%s\"/>" (centre col) (centre row) fill) |> ignore
        sb.Append(sprintf "<text x=\"%d\" y=\"%d\" text-anchor=\"middle\" font-family=\"sans-serif\" font-size=\"11\" fill=\"white\">%d</text>" (centre col) (centre row + 4) k) |> ignore
    sb.Append("</svg>") |> ignore
    HtmlString(sb.ToString()) :> IHtmlContent
