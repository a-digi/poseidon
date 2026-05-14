package response

import (
	"encoding/json"
)

type APIResponse struct {
	Status  string      `json:"status"`
	Message interface{} `json:"message"`
}

type Success struct {
	APIResponse
}

type Failure struct {
	APIResponse
}

// APIResponseJsonMessage ist ein spezieller Typ für JSON-Objekt-Nachrichten
// z.B. map[string]interface{} als Message

type APIResponseJsonMessage struct {
	Status  string                 `json:"status"`
	Message map[string]interface{} `json:"message"`
}

// APIResponseWithJsonMessage erzeugt eine APIResponse mit einer JSON-Message
func APIResponseWithJsonMessage(status string, message map[string]interface{}) string {
	resp := APIResponseJsonMessage{
		Status:  status,
		Message: message,
	}
	b, _ := json.Marshal(resp)
	return string(b)
}

func SuccessResponse(message interface{}) string {
	resp := Success{
		APIResponse: APIResponse{
			Status:  "success",
			Message: message,
		},
	}
	b, _ := json.Marshal(resp)

	return string(b)
}

func ErrorResponse(message interface{}) string {
	resp := Failure{
		APIResponse: APIResponse{
			Status:  "error",
			Message: message,
		},
	}
	b, _ := json.Marshal(resp)

	return string(b)
}
