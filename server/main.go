package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

// ChatRequest represents the incoming chat request
type ChatRequest struct {
	Message string `json:"message"`
}

// ChatResponse represents the outgoing chat response
type ChatResponse struct {
	Content string `json:"content"`
}

// LLMResponse represents the response from the LLM endpoint
type LLMResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

var (
	llmEndpoint string
	apiKey      string
)

func init() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file")
	}

	llmEndpoint = os.Getenv("AGENT_ENDPOINT")
	apiKey = os.Getenv("DATABRICKS_TOKEN")

	if llmEndpoint == "" || apiKey == "" {
		log.Fatal("Missing required environment variables")
	}
}

func main() {
	r := gin.Default()

	// Add CORS middleware
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowCredentials = true
	config.AllowMethods = []string{"GET", "POST", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept"}
	r.Use(cors.New(config))

	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "Welcome to the LLM Chat API"})
	})

	r.OPTIONS("/chat", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	r.POST("/chat", chatWithLLM)

	log.Println("Starting the server...")
	if err := r.Run(":8000"); err != nil {
		log.Fatal(err)
	}
}

func chatWithLLM(c *gin.Context) {
	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	log.Printf("Received message: %s", req.Message)

	payload := map[string]interface{}{
		"messages": []map[string]string{
			{"role": "user", "content": req.Message},
		},
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create payload"})
		return
	}

	log.Printf("Payload: %s", string(jsonPayload))

	client := &http.Client{}
	httpReq, err := http.NewRequest("POST", llmEndpoint, bytes.NewBuffer(jsonPayload))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
		return
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", apiKey))

	log.Printf("Sending request to LLM endpoint: %s", llmEndpoint)
	resp, err := client.Do(httpReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send request to LLM"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := ioutil.ReadAll(resp.Body)
		log.Printf("HTTP error occurred. Status: %d, Body: %s", resp.StatusCode, string(body))
		c.JSON(resp.StatusCode, gin.H{"error": "Error from LLM endpoint"})
		return
	}

	log.Println("Received response from LLM")

	var llmResp LLMResponse
	if err := json.NewDecoder(resp.Body).Decode(&llmResp); err != nil {
		log.Printf("Failed to decode response: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid response from LLM endpoint"})
		return
	}

	if len(llmResp.Choices) == 0 || llmResp.Choices[0].Message.Content == "" {
		log.Println("Invalid response structure from LLM")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid response structure from LLM endpoint"})
		return
	}

	content := llmResp.Choices[0].Message.Content
	c.JSON(http.StatusOK, ChatResponse{Content: content})
}
