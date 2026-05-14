package orm

import (
	"encoding/json"
	"net/http"
	"strconv"

	"t-digi-posseidon/src/plugins/model"
)

type PluginDBHandler struct {
	Manager *PluginDBManager
	Repo    model.PluginRepositoryInterface
}

func (h *PluginDBHandler) ensureActive(w http.ResponseWriter, id string) bool {
	if h.Repo == nil {
		return true
	}
	m, err := h.Repo.FindOneById(id)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte(`{"error":"plugin not found"}`))
		return false
	}
	if !m.Active {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		w.Write([]byte(`{"error":"plugin deactivated"}`))
		return false
	}
	return true
}

// CreateTable  POST /api/plugins/{id}/db/tables
func (h *PluginDBHandler) CreateTable(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if !h.ensureActive(w, id) {
		return
	}
	var schema TableSchema
	if err := json.NewDecoder(r.Body).Decode(&schema); err != nil {
		jsonErr(w, "invalid body", http.StatusBadRequest)
		return
	}
	if err := schema.Validate(); err != nil {
		jsonErr(w, err.Error(), http.StatusBadRequest)
		return
	}
	db, err := h.Manager.Open(id)
	if err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if _, err := db.Exec(schema.CreateSQL()); err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if err := storeSchema(db, schema); err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonOK(w, http.StatusCreated, map[string]string{"table": schema.Name})
}

// ListTables  GET /api/plugins/{id}/db/tables
func (h *PluginDBHandler) ListTables(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if !h.ensureActive(w, id) {
		return
	}
	db, err := h.Manager.Open(id)
	if err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	tables, err := ListTables(db)
	if err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if tables == nil {
		tables = []string{}
	}
	jsonOK(w, http.StatusOK, tables)
}

// DropTable  DELETE /api/plugins/{id}/db/tables/{table}
func (h *PluginDBHandler) DropTable(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if !h.ensureActive(w, id) {
		return
	}
	db, err := h.Manager.Open(id)
	if err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if err := DropTable(db, r.PathValue("table")); err != nil {
		jsonErr(w, err.Error(), http.StatusBadRequest)
		return
	}
	jsonOK(w, http.StatusOK, map[string]string{"status": "dropped"})
}

// InsertRecord  POST /api/plugins/{id}/db/{table}
func (h *PluginDBHandler) InsertRecord(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if !h.ensureActive(w, id) {
		return
	}
	db, err := h.Manager.Open(id)
	if err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	var data map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		jsonErr(w, "invalid body", http.StatusBadRequest)
		return
	}
	record, err := Insert(db, r.PathValue("table"), data)
	if err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonOK(w, http.StatusCreated, record)
}

// QueryRecords  GET /api/plugins/{id}/db/{table}
func (h *PluginDBHandler) QueryRecords(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if !h.ensureActive(w, id) {
		return
	}
	db, err := h.Manager.Open(id)
	if err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))
	filter := QueryFilter{
		Limit:   limit,
		Offset:  offset,
		OrderBy: q.Get("order_by"),
		Order:   q.Get("order"),
	}
	records, err := FindAll(db, r.PathValue("table"), filter)
	if err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if records == nil {
		records = []map[string]interface{}{}
	}
	jsonOK(w, http.StatusOK, records)
}

// GetRecord  GET /api/plugins/{id}/db/{table}/{record_id}
func (h *PluginDBHandler) GetRecord(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if !h.ensureActive(w, id) {
		return
	}
	db, err := h.Manager.Open(id)
	if err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	record, err := FindOne(db, r.PathValue("table"), r.PathValue("record_id"))
	if err != nil {
		jsonErr(w, err.Error(), http.StatusNotFound)
		return
	}
	jsonOK(w, http.StatusOK, record)
}

// UpdateRecord  PUT /api/plugins/{id}/db/{table}/{record_id}
func (h *PluginDBHandler) UpdateRecord(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if !h.ensureActive(w, id) {
		return
	}
	db, err := h.Manager.Open(id)
	if err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	var data map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		jsonErr(w, "invalid body", http.StatusBadRequest)
		return
	}
	record, err := Update(db, r.PathValue("table"), r.PathValue("record_id"), data)
	if err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	jsonOK(w, http.StatusOK, record)
}

// DeleteRecord  DELETE /api/plugins/{id}/db/{table}/{record_id}
func (h *PluginDBHandler) DeleteRecord(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if !h.ensureActive(w, id) {
		return
	}
	db, err := h.Manager.Open(id)
	if err != nil {
		jsonErr(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if err := Delete(db, r.PathValue("table"), r.PathValue("record_id")); err != nil {
		jsonErr(w, err.Error(), http.StatusNotFound)
		return
	}
	jsonOK(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func jsonOK(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func jsonErr(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
