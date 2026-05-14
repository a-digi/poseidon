package main

import (
	"fmt"
	"io"
	"net/http"
	"strings"
)

func main() {
	url := "http://localhost:2022/api/databases/poseidon/search"
	method := "POST"

	payload := strings.NewReader(`query { playlist(fields: ["id", "name", "created"]) { id name created } }`)
	client := &http.Client{}
	req, err := http.NewRequest(method, url, payload)
	if err != nil {
		fmt.Println(err)
		return
	}
	req.Header.Add("Content-Type", "text/plain")
	res, err := client.Do(req)
	if err != nil {
		fmt.Println(err)
		return
	}
	defer res.Body.Close()
	fmt.Printf("HTTP-Status: %d\n", res.StatusCode)
	body, err := io.ReadAll(res.Body)
	if err != nil {
		fmt.Println(err)
		return
	}
	fmt.Println(string(body))
}
