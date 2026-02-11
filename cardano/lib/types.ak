/// Shared types for Cognosis Zener Oracle
/// Zener card symbols (1-5)
pub type ZenerSymbol {
  Circle
  // 1
  Cross
  // 2
  Square
  // 3
  Star
  // 4
  Waves
}

// 5

/// Convert int to symbol
pub fn int_to_symbol(n: Int) -> ZenerSymbol {
  when n is {
    1 -> Circle
    2 -> Cross
    3 -> Square
    4 -> Star
    _ -> Waves
  }
}

/// Convert symbol to int
pub fn symbol_to_int(s: ZenerSymbol) -> Int {
  when s is {
    Circle -> 1
    Cross -> 2
    Square -> 3
    Star -> 4
    Waves -> 5
  }
}
