// setup.fsx
//
// This script is loaded at the beginning of every F# notebook via
//
//     #load "../setup.fsx"
//
// By default, .NET Interactive displays values as HTML tables.  For the data
// structures used in this lecture (sets, lists, tuples, and discriminated unions
// representing formulas) these tables are hard to read.  Therefore, we register
// a formatter that displays every value as plain text in F# syntax, e.g. a set of
// integers is displayed as `set [1; 2; 3]`.
//
// We do not use the format "%A" of `printfn` for this purpose, because "%A"
// truncates sets after 9 elements and lists after 100 elements.  The function
// `show` defined below never truncates.
//
// In a notebook cell, the formatter is used for the value of the last expression
// of the cell.  Furthermore, the function `print` defined below prints a value
// in the same format, e.g. `print (set [1; 2])` prints `set [1; 2]`.  The
// function `print` is useful inside loops.
//
// HTML content (e.g. the style sheet loaded in the first cell of every notebook)
// is still rendered as HTML.

// The attribute `AutoOpen` makes the functions `show` and `print` available in
// the notebook without the need to write `open Setup`.
[<AutoOpen>]
module Setup

open System
open System.Collections
open Microsoft.FSharp.Reflection
open Microsoft.DotNet.Interactive.Formatting

/// Additional printers for types that are not F# types, e.g. Z3 expressions.
/// A printer returns `Some s` if it can display the given value.
let mutable private customPrinters : (obj -> string option) list = []

/// `registerShow printer` adds a printer that is used by `show`.
let registerShow (printer: obj -> string option) : unit =
    customPrinters <- printer :: customPrinters

/// `show x` converts the value `x` into a string using F# syntax.
let rec show (x: obj) : string =
    match x with
    | null -> "None"
    | _ when customPrinters |> List.exists (fun p -> (p x).IsSome) ->
        customPrinters |> List.pick (fun p -> p x)
    | :? string as s -> sprintf "%A" s
    | :? float as f ->
        // "R" gives the shortest representation that can be read back exactly
        let s = f.ToString("R", Globalization.CultureInfo.InvariantCulture)
        if s.Contains "." || s.Contains "E" || Double.IsNaN f || Double.IsInfinity f then s else s + ".0"
    | _ ->
    let t = x.GetType()
    let name = if t.IsGenericType then t.GetGenericTypeDefinition().Name else t.Name
    let elements (xs: obj) = [ for e in (xs :?> IEnumerable) -> show e ] |> String.concat "; "
    if name = "FSharpSet`1" then
        sprintf "set [%s]" (elements x)
    elif name = "FSharpMap`2" then
        let pairs = [ for kv in (x :?> IEnumerable) ->
                        let p = kv.GetType()
                        sprintf "(%s, %s)" (show (p.GetProperty("Key").GetValue kv))
                                           (show (p.GetProperty("Value").GetValue kv)) ]
        sprintf "map [%s]" (String.concat "; " pairs)
    elif name = "FSharpList`1" then
        sprintf "[%s]" (elements x)
    elif t.IsArray then
        sprintf "[|%s|]" (elements x)
    elif FSharpType.IsTuple t then
        FSharpValue.GetTupleFields x |> Array.map show |> String.concat ", " |> sprintf "(%s)"
    elif FSharpType.IsRecord t then
        FSharpType.GetRecordFields t
        |> Array.map (fun f -> sprintf "%s = %s" f.Name (show (f.GetValue x)))
        |> String.concat "; " |> sprintf "{ %s }"
    elif FSharpType.IsUnion t then
        let case, fields = FSharpValue.GetUnionFields(x, t)
        match fields with
        | [||]  -> case.Name
        | [| f |] -> sprintf "%s %s" case.Name (showArg f)
        | _     -> fields |> Array.map show |> String.concat ", " |> sprintf "%s (%s)" case.Name
    else
        sprintf "%A" x

/// `showArg x` shows `x` as the argument of a union case: if necessary, the
/// result is enclosed in parentheses.
and showArg (x: obj) : string =
    let s = show x
    let needsParens =
        x <> null && FSharpType.IsUnion(x.GetType()) && s.Contains " "
        || s.StartsWith "-"
    if needsParens then sprintf "(%s)" s else s

/// `print x` prints the value `x` in F# syntax, followed by a newline.
let print (x: 'a) : unit =
    printfn "%s" (show (box x))

// ---------------------------------------------------------------------------
// Importing notebooks
//
// `importNotebook "Name.ipynb"` makes the definitions of another notebook
// available in the current notebook.  It plays the role of `%run Name.ipynb` in
// the Python notebooks.  It works as follows:
//
//   - Only code cells that contain *definitions* are executed, i.e. cells that
//     start with `let`, `type`, `open`, `module`, `exception`, `#r`, or an
//     attribute `[<...>]`.  Furthermore, cells starting with `do` are executed.
//     These cells contain actions that are needed by the definitions, e.g. the
//     registration of a printer.  Cells containing tests or examples are skipped.  The
//     first cell, which loads this setup script and the style sheet, is skipped.
//   - If the imported notebook itself imports other notebooks, these are
//     imported first.
//   - Every notebook is imported at most once.  This is important, since
//     defining a type a second time would create a new type that is
//     incompatible with the first one.
//
// The definitions become available after the cell containing the call of
// `importNotebook` has finished.  Hence, this call should be the only content
// of its cell.  If an imported notebook is changed, the kernel has to be
// restarted before the notebook can be imported again.

open System.IO
open System.Text.Json
open System.Threading
open System.Threading.Tasks
open Microsoft.DotNet.Interactive
open Microsoft.DotNet.Interactive.Commands
open Microsoft.DotNet.Interactive.Events

let private importedNotebooks = Collections.Generic.HashSet<string>()

/// the code cells of the notebook stored in `path`
let private codeCells (path: string) : string list =
    use doc = JsonDocument.Parse(File.ReadAllText path)
    [ for cell in doc.RootElement.GetProperty("cells").EnumerateArray() do
        if cell.GetProperty("cell_type").GetString() = "code" then
            let src = cell.GetProperty("source")
            if src.ValueKind = JsonValueKind.Array then
                String.concat "" [ for line in src.EnumerateArray() -> line.GetString() ]
            else
                src.GetString() ]

/// the lines of `code` that are neither empty nor comments
let private significantLines (code: string) : string list =
    [ for line in code.Split('\n') do
        let l = line.Trim()
        if l <> "" && not (l.StartsWith "//") then l ]

let private isDefinition (code: string) : bool =
    match significantLines code with
    | first :: _ ->
        [ "let "; "type "; "open "; "module "; "exception "; "do "; "#r "; "[<" ]
        |> List.exists (fun keyword -> first.StartsWith keyword)
    | [] -> false

/// If `code` is a call of `importNotebook`, the name of the imported notebook is returned.
let private importedName (code: string) : string option =
    match significantLines code with
    | [ line ] when line.StartsWith "importNotebook \"" ->
        Some (line.Substring("importNotebook \"".Length).TrimEnd('"'))
    | _ -> None

/// The definition cells of the notebook `path` and of all notebooks imported by it.
/// Every cell is returned as a pair consisting of the name of the notebook and the code.
let rec private collectDefinitions (path: string) : (string * string) list =
    let fullPath = Path.GetFullPath path
    if importedNotebooks.Contains fullPath then
        []
    else
        importedNotebooks.Add fullPath |> ignore
        let dir  = Path.GetDirectoryName fullPath
        let name = Path.GetFileName fullPath
        [ for code in codeCells fullPath do
            match importedName code with
            | Some other -> yield! collectDefinitions (Path.Combine(dir, other))
            | None       -> if isDefinition code then yield (name, code) ]

/// Type check the given cells.  Every cell is wrapped into a module of its own,
/// which is then opened.  The `open` declarations of a cell are repeated after
/// its module, since they would otherwise only be visible inside the module.  This way, a cell may redefine a value that has been
/// defined in a previous cell, as it is possible in a notebook.  Directives
/// like `#r` are moved to the beginning.  The function returns the list of
/// error messages.
let private typeCheck (kernel: Kernel) (cells: (string * string) list) : string list =
    let directives = ResizeArray<string>()
    let body       = ResizeArray<string>()
    let origin     = ResizeArray<string>()   // origin[k] describes line k of the code
    for k, (name, code) in List.indexed cells do
        body.Add(sprintf "module ImportedCell%d =" k); origin.Add name
        for line in code.Split('\n') do
            if line.StartsWith "#r " then
                directives.Add line
            else
                body.Add("    " + line); origin.Add(sprintf "%s: %s" name (line.Trim()))
        body.Add("    do ()"); origin.Add name
        body.Add(sprintf "open ImportedCell%d" k); origin.Add name
        // an `open` inside the module only applies to the module itself
        for line in code.Split('\n') do
            if line.StartsWith "open " then
                body.Add line; origin.Add(sprintf "%s: %s" name (line.Trim()))
    let code   = String.concat "\n" (Seq.append directives body)
    let offset = directives.Count
    let result = kernel.SendAsync(RequestDiagnostics(code)).Result
    [ for event in result.Events do
        match event with
        | :? DiagnosticsProduced as d ->
            for diag in d.Diagnostics do
                if string diag.Severity = "Error" then
                    let line = diag.LinePositionSpan.Start.Line - offset
                    let where = if 0 <= line && line < origin.Count then origin[line] else ""
                    yield sprintf "%s\n    in %s" diag.Message where
        | _ -> () ]

/// `importNotebook path` executes the definitions of the notebook stored in `path`.
let importNotebook (path: string) : unit =
    let cells  = collectDefinitions path
    let names  = cells |> List.map fst |> List.distinct
    let kernel = Kernel.Root.FindKernelByName "fsharp"
    let errors = typeCheck kernel cells
    if errors.IsEmpty then
        // Every cell is submitted separately.  The submissions are executed after
        // the current cell has finished, in the order in which they are sent.  If
        // they were executed as part of the current cell, the F# kernel would
        // forget the definitions once the current cell is finished.
        use _ = ExecutionContext.SuppressFlow()
        Task.Run(fun () ->
            let tasks = [ for (_, code) in cells -> kernel.SendAsync(SubmitCode(code)) ]
            Task.WhenAll(tasks) :> Task) |> ignore
        if not names.IsEmpty then
            printfn "imported %s" (String.concat ", " names)
    else
        for name in names do
            let dir = Path.GetDirectoryName(Path.GetFullPath path)
            importedNotebooks.Remove(Path.GetFullPath(Path.Combine(dir, name))) |> ignore
        printfn "Error while importing %s:" (String.concat ", " names)
        for e in List.distinct errors do printfn "%s" e

// ---------------------------------------------------------------------------
// Running shell commands
//
// `shell command` runs `command` in a shell and prints its output.  It plays the
// role of `!command` in the Python notebooks.  The command is stopped after
// `timeLimit` seconds.

let shellWithTimeLimit (timeLimit: int) (command: string) : unit =
    let info = Diagnostics.ProcessStartInfo("/bin/sh", [| "-c"; command |])
    info.RedirectStandardOutput <- true
    info.RedirectStandardError  <- true
    use proc = Diagnostics.Process.Start info
    let output = proc.StandardOutput.ReadToEndAsync()
    let errors = proc.StandardError.ReadToEndAsync()
    if not (proc.WaitForExit(timeLimit * 1000)) then
        proc.Kill true
        printfn "*** the command has been stopped after %d seconds ***" timeLimit
    printf "%s%s" output.Result errors.Result

let shell (command: string) : unit = shellWithTimeLimit 600 command

// ---------------------------------------------------------------------------
// Installing the SMT solver Z3
//
// The notebooks of chapter 5 use the SMT solver Z3.  The package `Microsoft.Z3`
// that is available via NuGet does not support Macs with Apple silicon.
// Therefore, `installZ3 ()` downloads the package from the Z3 release page on
// GitHub and extracts it into the directory `packages/Microsoft.Z3` next to this
// script.  This is only done if the package has not been installed before.
// Afterwards, the script `z3.fsx` can be loaded via `#load "../z3.fsx"`.

let z3Version = "5.1.0"

let installZ3 () : unit =
    let target = Path.Combine(__SOURCE_DIRECTORY__, "packages", "Microsoft.Z3")
    if not (Directory.Exists(Path.Combine(target, "lib"))) then
        let url = sprintf "https://github.com/Z3Prover/z3/releases/download/z3-%s/Microsoft.Z3.%s.nupkg" z3Version z3Version
        let nupkg = Path.Combine(__SOURCE_DIRECTORY__, "packages", sprintf "Microsoft.Z3.%s.nupkg" z3Version)
        Directory.CreateDirectory(Path.GetDirectoryName nupkg) |> ignore
        if not (File.Exists nupkg) then
            printfn "downloading %s ..." url
            use client = new Net.Http.HttpClient()
            File.WriteAllBytes(nupkg, client.GetByteArrayAsync(url).Result)
        IO.Compression.ZipFile.ExtractToDirectory(nupkg, target)
        printfn "Z3 %s has been installed." z3Version

// ---------------------------------------------------------------------------

Formatter.Register<obj>((fun (o: obj) (w: IO.TextWriter) -> w.Write(show o)), "text/plain")
Formatter.SetPreferredMimeTypesFor(typeof<obj>, "text/plain")
Formatter.SetPreferredMimeTypesFor(typeof<Microsoft.AspNetCore.Html.IHtmlContent>, "text/html")
