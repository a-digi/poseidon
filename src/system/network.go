package system

import "net"

var linkLocal = func() *net.IPNet {
	_, n, _ := net.ParseCIDR("169.254.0.0/16")
	return n
}()

func LANAddresses() []string {
	ifaces, err := net.Interfaces()
	if err != nil {
		return []string{}
	}
	addrs := []string{}
	for _, iface := range ifaces {
		if iface.Flags&net.FlagUp == 0 {
			continue
		}
		if iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		if iface.Flags&net.FlagPointToPoint != 0 {
			continue
		}
		ifAddrs, err := iface.Addrs()
		if err != nil {
			continue
		}
		for _, a := range ifAddrs {
			ipNet, ok := a.(*net.IPNet)
			if !ok {
				continue
			}
			ip4 := ipNet.IP.To4()
			if ip4 == nil {
				continue
			}
			if linkLocal.Contains(ip4) {
				continue
			}
			addrs = append(addrs, ip4.String())
		}
	}
	return addrs
}
