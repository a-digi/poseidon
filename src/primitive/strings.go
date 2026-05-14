package primitive

// Maskiert ein Token: Zeigt die ersten 4 und letzten 4 Zeichen, dazwischen immer 4 *
func MaskToken(token string) string {
	if len(token) <= 8 {
		return "****"
	}
	return token[:4] + "****" + token[len(token)-4:]
}

// Prüft, ob ein Pfad Sonderzeichen enthält
func HasSpecialChars(path string) bool {
	for _, r := range path {
		if !(r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z' || r >= '0' && r <= '9' || r == '/' || r == '-' || r == '_' || r == '.' || r == ' ') {
			return true
		}
	}
	return false
}

