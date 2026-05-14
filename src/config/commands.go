package config

// parseAllowedCommands parst nur erlaubte Kommandos (beginnen mit --)
func ParseAllowedCommands(args []string) map[string]string {
	result := make(map[string]string)
	for _, arg := range args {
		if len(arg) > 2 && arg[:2] == "--" {
			cmd := arg[2:]
			if eqIdx := indexOf(cmd, '='); eqIdx > 0 {
				key := cmd[:eqIdx]
				val := cmd[eqIdx+1:]
				result[key] = val
			} else {
				result[cmd] = "true"
			}
		}
	}
	return result
}

// indexOf gibt den Index des ersten Vorkommens von sep in s zurück, oder -1
func indexOf(s string, sep byte) int {
	for i := 0; i < len(s); i++ {
		if s[i] == sep {
			return i
		}
	}
	return -1
}

