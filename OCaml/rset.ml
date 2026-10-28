(* rset.ml: finite sets that can be nested and finite maps.  The modules RSet and RMap
   play the roles of the Python types frozenset and dict, but the maps of RMap can not be
   changed either.  The file setup.ml loads this file, so both modules are available in
   every notebook.

   The module Set of the standard library is not suitable for our purposes:
   - Set.Make has to be applied to a module for every element type, i.e. we would
     need separate modules for sets of strings, sets of literals, sets of sets of
     literals, and so on.
   - Two sets created by Set.Make are equal if Set.equal says so, but the operator =
     compares the balanced trees that represent the sets.  These trees depend on the
     order in which the elements have been inserted.  Hence = can be false for equal
     sets, and therefore sets of sets do not work with =.

   Here, a set is represented as a list that is sorted in ascending order and does not
   contain duplicates.  The order is the polymorphic order Stdlib.compare.  As every
   set has exactly one such representation, two sets are equal if and only if their
   representations are equal.  Therefore, the polymorphic operators =, <>, <, and the
   function compare work correctly for sets, even for sets of sets.  The type 'a t is
   abstract, so the invariant can not be violated outside of this module.

   The price we pay is efficiency: mem, add, and remove take time linear in the size
   of the set.  The operations union, inter, diff, and subset merge two sorted lists
   and are linear, too. *)

module RSet : sig
  (* the type of sets with elements of type 'a; the + declares that 'a t is covariant
     in 'a, which allows OCaml to generalize the type of expressions like
     RSet.of_list [] *)
  type +'a t

  (* construction *)
  val empty       : 'a t                         (* the empty set {} *)
  val singleton   : 'a -> 'a t                   (* singleton x = {x} *)
  val of_list     : 'a list -> 'a t              (* the set of the elements of a list *)
  val to_list     : 'a t -> 'a list              (* the elements in ascending order *)

  (* tests and queries *)
  val is_empty    : 'a t -> bool                 (* is_empty s iff s = {} *)
  val cardinal    : 'a t -> int                  (* the number of elements *)
  val mem         : 'a -> 'a t -> bool           (* mem x s iff x ∈ s *)
  val subset      : 'a t -> 'a t -> bool         (* subset a b iff a ⊆ b *)
  val equal       : 'a t -> 'a t -> bool         (* the same as = *)
  val compare     : 'a t -> 'a t -> int          (* a total order on sets *)
  val choose      : 'a t -> 'a                   (* the smallest element *)
  val pick_random : 'a t -> 'a                   (* a random element *)

  (* operations that return new sets *)
  val add         : 'a -> 'a t -> 'a t           (* add x s = s ∪ {x} *)
  val remove      : 'a -> 'a t -> 'a t           (* remove x s = s \ {x} *)
  val union       : 'a t -> 'a t -> 'a t         (* union a b = a ∪ b *)
  val inter       : 'a t -> 'a t -> 'a t         (* inter a b = a ∩ b *)
  val diff        : 'a t -> 'a t -> 'a t         (* diff a b = a \ b *)
  val sym_diff    : 'a t -> 'a t -> 'a t         (* sym_diff a b = (a \ b) ∪ (b \ a) *)
  val unions      : 'a t list -> 'a t            (* the union of a list of sets *)
  val cartesian_product : 'a t -> 'b t -> ('a * 'b) t   (* a × b *)
  val powerset    : 'a t -> 'a t t               (* the set of all subsets *)

  (* functional programming with sets *)
  val filter      : ('a -> bool) -> 'a t -> 'a t           (* { x ∈ s | p(x) } *)
  val map         : ('a -> 'b) -> 'a t -> 'b t             (* { f(x) | x ∈ s } *)
  val filter_map  : ('a -> 'b option) -> 'a t -> 'b t      (* { y | x ∈ s, f(x) = Some y } *)
  val flat_map    : ('a -> 'b t) -> 'a t -> 'b t           (* the union of all f(x), x ∈ s *)
  val for_all     : ('a -> bool) -> 'a t -> bool           (* ∀ x ∈ s: p(x) *)
  val exists      : ('a -> bool) -> 'a t -> bool           (* ∃ x ∈ s: p(x) *)
  val fold        : ('a -> 'acc -> 'acc) -> 'a t -> 'acc -> 'acc
  val iter        : ('a -> unit) -> 'a t -> unit

  (* conversion to strings *)
  val to_string   : ('a -> string) -> 'a t -> string
  val pp          : (Format.formatter -> 'a -> unit) -> Format.formatter -> 'a t -> unit
end = struct
  type 'a t = 'a list

  let empty       = []
  let singleton x = [x]
  let to_list s   = s
  let is_empty s  = s = []
  let cardinal    = List.length
  let equal a b   = a = b
  let compare     = Stdlib.compare

  (* The union of two sets is computed by merging the sorted lists.  The attribute
     tail_mod_cons makes the function tail recursive, so that it works for long lists. *)
  let[@tail_mod_cons] rec union a b =
    match a, b with
    | [], s | s, [] -> s
    | x :: a', y :: b' ->
        let c = Stdlib.compare x y in
        if c < 0 then x :: union a' b
        else if c > 0 then y :: union a b'
        else x :: union a' b'

  (* runs l splits the list l into maximal strictly ascending sublists.  Duplicates
     that follow each other are dropped.  For example,
       runs [1; 3; 3; 5; 2; 4; 1] = [[1; 3; 5]; [2; 4]; [1]]. *)
  let runs (l : 'a list) : 'a list list =
    let rec go run acc l =
      match l, run with
      | [], _          -> List.rev (List.rev run :: acc)
      | x :: rest, []  -> go [x] acc rest
      | x :: rest, y :: _ ->
          let c = Stdlib.compare y x in
          if c < 0 then go (x :: run) acc rest
          else if c = 0 then go run acc rest
          else go [x] (List.rev run :: acc) rest
    in
    if l = [] then [] else go [] [] l

  (* unions merges the sets of a list pairwise until only one set is left.  If there
     are k sets with n elements altogether, this takes O(n * log k) comparisons. *)
  let rec unions (sets : 'a list list) : 'a list =
    let rec merge_pairs = function
      | a :: b :: rest -> union a b :: merge_pairs rest
      | rest           -> rest
    in
    match sets with
    | []  -> []
    | [s] -> s
    | _   -> unions (merge_pairs sets)

  (* of_list sorts the list by merging its ascending runs ("natural merge sort").
     A list that is already sorted is returned unchanged after one pass, and a list
     that is almost sorted is sorted quickly.  This is important for map and
     filter_map, since these functions often preserve the order of most elements. *)
  let of_list l = unions (runs l)

  (* As the list is sorted, the search can stop as soon as an element greater than x
     is found. *)
  let rec mem x = function
    | []     -> false
    | y :: s -> let c = Stdlib.compare x y in c = 0 || (c > 0 && mem x s)

  let add x s = union [x] s

  let[@tail_mod_cons] rec remove x = function
    | [] -> []
    | y :: s ->
        let c = Stdlib.compare x y in
        if c < 0 then y :: s
        else if c = 0 then s
        else y :: remove x s

  let[@tail_mod_cons] rec inter a b =
    match a, b with
    | [], _ | _, [] -> []
    | x :: a', y :: b' ->
        let c = Stdlib.compare x y in
        if c < 0 then inter a' b
        else if c > 0 then inter a b'
        else x :: inter a' b'

  let[@tail_mod_cons] rec diff a b =
    match a, b with
    | [], _ -> []
    | s, [] -> s
    | x :: a', y :: b' ->
        let c = Stdlib.compare x y in
        if c < 0 then x :: diff a' b
        else if c > 0 then diff a b'
        else diff a' b'

  let sym_diff a b = union (diff a b) (diff b a)

  let rec subset a b =
    match a, b with
    | [], _ -> true
    | _, [] -> false
    | x :: a', y :: b' ->
        let c = Stdlib.compare x y in
        if c < 0 then false
        else if c > 0 then subset a b'
        else subset a' b'

  let choose = function
    | []     -> invalid_arg "RSet.choose: the set is empty"
    | x :: _ -> x

  let pick_random = function
    | [] -> invalid_arg "RSet.pick_random: the set is empty"
    | s  -> List.nth s (Random.int (List.length s))

  (* The pairs are generated in lexicographic order, which is the order of compare
     on pairs.  Hence, no sorting is necessary. *)
  let cartesian_product a b =
    List.concat_map (fun x -> List.map (fun y -> (x, y)) b) a

  (* The subsets of {x} ∪ s, where x is smaller than all elements of s, are generated
     in ascending order:  First comes the empty set.  Next come the subsets containing
     x, as x is the smallest element.  These are the sets x :: t where t is a subset
     of s.  Finally come the nonempty subsets of s.  As the power set grows
     exponentially, sets with more than 20 elements are rejected. *)
  let powerset s =
    let rec pow = function
      | []      -> [[]]
      | x :: xs -> let p = pow xs in [] :: List.map (fun t -> x :: t) p @ List.tl p
    in
    if List.length s > 20 then
      invalid_arg "RSet.powerset: the set has more than 20 elements"
    else
      pow s

  let filter       = List.filter
  let map f s      = of_list (List.map f s)
  let filter_map f s = of_list (List.filter_map f s)
  let flat_map f s = unions (List.map f s)
  let for_all      = List.for_all
  let exists       = List.exists
  let fold f s acc = List.fold_left (fun acc x -> f x acc) acc s
  let iter         = List.iter

  let to_string elem_to_string s =
    "{" ^ String.concat ", " (List.map elem_to_string s) ^ "}"

  (* pp is the printer that the toplevel uses for sets.  It gets the printer for the
     elements as its first argument.  The toplevel prints only a limited number of
     nodes of a value (see #print_length).  Once this limit is reached, the printer of
     the elements prints every element as "...".  Therefore, every element is first
     printed into a string.  If this string is "...", it is printed once and the
     remaining elements are skipped. *)
  let pp pp_elem fmt s =
    let elem_to_string x =
      let buffer = Buffer.create 16 in
      let f      = Format.formatter_of_buffer buffer in
      Format.pp_set_margin f 1_000_000;     (* an element is printed on one line *)
      pp_elem f x;
      Format.pp_print_flush f ();
      Buffer.contents buffer
    in
    let rec print_elems first = function
      | []        -> ()
      | x :: rest ->
          if not first then Format.fprintf fmt ",@ ";
          let str = elem_to_string x in
          Format.pp_print_string fmt str;
          if str <> "..." then print_elems false rest
    in
    Format.fprintf fmt "@[<hov 1>{%a}@]" (fun _ -> print_elems true) s
end;;

#install_printer RSet.pp;;

(* RMap implements finite maps, i.e. functions with a finite domain, from keys of type
   'k to values of type 'v.  A map is represented as a list of pairs (key, value) that
   is sorted by the keys in ascending order, where every key occurs only once.  As with
   RSet, every map has exactly one representation.  Therefore = and compare work for
   maps, and maps can be elements of sets or keys of other maps.  find, add, and remove
   take time linear in the size of the map. *)
module RMap : sig
  type (+'k, +'v) t

  val empty     : ('k, 'v) t                          (* the empty map *)
  val singleton : 'k -> 'v -> ('k, 'v) t              (* the map {k ↦ v} *)
  val of_list   : ('k * 'v) list -> ('k, 'v) t        (* for duplicate keys, the last pair wins *)
  val to_list   : ('k, 'v) t -> ('k * 'v) list        (* the pairs, ordered by their keys *)

  val is_empty  : ('k, 'v) t -> bool
  val cardinal  : ('k, 'v) t -> int                   (* the number of keys *)
  val mem       : 'k -> ('k, 'v) t -> bool            (* mem k m iff k is a key of m *)
  val find      : 'k -> ('k, 'v) t -> 'v              (* raises Not_found if k is no key *)
  val find_opt  : 'k -> ('k, 'v) t -> 'v option
  val keys      : ('k, 'v) t -> 'k RSet.t             (* the domain of the map *)
  val values    : ('k, 'v) t -> 'v list               (* the values, ordered by their keys *)

  val add       : 'k -> 'v -> ('k, 'v) t -> ('k, 'v) t   (* replaces an old value of k *)
  val remove    : 'k -> ('k, 'v) t -> ('k, 'v) t
  val map       : ('v -> 'w) -> ('k, 'v) t -> ('k, 'w) t
  val filter    : ('k -> 'v -> bool) -> ('k, 'v) t -> ('k, 'v) t
  val for_all   : ('k -> 'v -> bool) -> ('k, 'v) t -> bool
  val exists    : ('k -> 'v -> bool) -> ('k, 'v) t -> bool
  val fold      : ('k -> 'v -> 'acc -> 'acc) -> ('k, 'v) t -> 'acc -> 'acc
  val iter      : ('k -> 'v -> unit) -> ('k, 'v) t -> unit

  val to_string : ('k -> string) -> ('v -> string) -> ('k, 'v) t -> string
  val pp        : (Format.formatter -> 'k -> unit) -> (Format.formatter -> 'v -> unit)
                  -> Format.formatter -> ('k, 'v) t -> unit
end = struct
  type ('k, 'v) t = ('k * 'v) list

  let empty         = []
  let singleton k v = [(k, v)]
  let to_list m     = m
  let is_empty m    = m = []
  let cardinal      = List.length

  (* The pairs are sorted by their keys with a stable sort, so that pairs with the same
     key keep their order.  Of every group of pairs with the same key, the last one is
     kept. *)
  let of_list l =
    let sorted = List.stable_sort (fun (k1, _) (k2, _) -> Stdlib.compare k1 k2) l in
    let rec last_of_each = function
      | (k1, _) :: ((k2, _) :: _ as rest) when Stdlib.compare k1 k2 = 0 -> last_of_each rest
      | pair :: rest -> pair :: last_of_each rest
      | [] -> []
    in
    last_of_each sorted

  let rec find_opt k = function
    | [] -> None
    | (k', v) :: rest ->
        let c = Stdlib.compare k k' in
        if c = 0 then Some v else if c < 0 then None else find_opt k rest

  let find k m = match find_opt k m with Some v -> v | None -> raise Not_found
  let mem k m  = find_opt k m <> None

  let keys m   = RSet.of_list (List.map fst m)    (* already sorted, hence linear *)
  let values m = List.map snd m

  let[@tail_mod_cons] rec add k v = function
    | [] -> [(k, v)]
    | ((k', _) as pair) :: rest ->
        let c = Stdlib.compare k k' in
        if c < 0 then (k, v) :: pair :: rest
        else if c = 0 then (k, v) :: rest
        else pair :: add k v rest

  let[@tail_mod_cons] rec remove k = function
    | [] -> []
    | ((k', _) as pair) :: rest ->
        let c = Stdlib.compare k k' in
        if c < 0 then pair :: rest
        else if c = 0 then rest
        else pair :: remove k rest

  let map f m        = List.map (fun (k, v) -> (k, f v)) m
  let filter p m     = List.filter (fun (k, v) -> p k v) m
  let for_all p m    = List.for_all (fun (k, v) -> p k v) m
  let exists p m     = List.exists (fun (k, v) -> p k v) m
  let fold f m acc   = List.fold_left (fun acc (k, v) -> f k v acc) acc m
  let iter f m       = List.iter (fun (k, v) -> f k v) m

  let to_string key_to_string value_to_string m =
    "{" ^ String.concat ", "
            (List.map (fun (k, v) -> key_to_string k ^ " ↦ " ^ value_to_string v) m) ^ "}"

  (* pp is the printer that the toplevel uses for maps.  As for sets, every pair is
     first printed into a string, so that printing stops at the first pair whose value
     the toplevel abbreviates as "...". *)
  let pp pp_key pp_value fmt m =
    let pair_to_string (k, v) =
      let buffer = Buffer.create 16 in
      let f      = Format.formatter_of_buffer buffer in
      Format.pp_set_margin f 1_000_000;
      Format.fprintf f "%a ↦ %a" pp_key k pp_value v;
      Format.pp_print_flush f ();
      Buffer.contents buffer
    in
    let rec print_pairs first = function
      | []        -> ()
      | p :: rest ->
          if not first then Format.fprintf fmt ",@ ";
          let str = pair_to_string p in
          Format.pp_print_string fmt str;
          if not (String.ends_with ~suffix:"..." str) then print_pairs false rest
    in
    Format.fprintf fmt "@[<hov 1>{%a}@]" (fun _ -> print_pairs true) m
end;;

#install_printer RMap.pp;;
