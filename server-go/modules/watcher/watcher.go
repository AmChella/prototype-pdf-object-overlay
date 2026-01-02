package watcher

import (
	"log"
	"sync"

	"github.com/fsnotify/fsnotify"
)

// FileChangeCallback is called when a file changes
type FileChangeCallback func(eventType string, filePath string)

// Watcher watches for file changes
type Watcher struct {
	watcher    *fsnotify.Watcher
	callbacks  []FileChangeCallback
	watchPaths []string
	mu         sync.Mutex
	running    bool
}

// New creates a new file watcher
func New() (*Watcher, error) {
	w, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, err
	}

	return &Watcher{
		watcher:    w,
		callbacks:  make([]FileChangeCallback, 0),
		watchPaths: make([]string, 0),
	}, nil
}

// OnFileChange registers a callback for file change events
func (w *Watcher) OnFileChange(callback FileChangeCallback) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.callbacks = append(w.callbacks, callback)
}

// AddPath adds a path to watch
func (w *Watcher) AddPath(path string) error {
	if err := w.watcher.Add(path); err != nil {
		return err
	}
	w.mu.Lock()
	w.watchPaths = append(w.watchPaths, path)
	w.mu.Unlock()
	return nil
}

// Start starts watching for file changes
func (w *Watcher) Start() {
	w.mu.Lock()
	if w.running {
		w.mu.Unlock()
		return
	}
	w.running = true
	w.mu.Unlock()

	log.Println("👀 Starting file watchers...")

	go func() {
		for {
			select {
			case event, ok := <-w.watcher.Events:
				if !ok {
					return
				}

				var eventType string
				switch {
				case event.Op&fsnotify.Create == fsnotify.Create:
					eventType = "add"
				case event.Op&fsnotify.Write == fsnotify.Write:
					eventType = "change"
				case event.Op&fsnotify.Remove == fsnotify.Remove:
					eventType = "unlink"
				case event.Op&fsnotify.Rename == fsnotify.Rename:
					eventType = "rename"
				default:
					continue
				}

				log.Printf("📁 File %s: %s", eventType, event.Name)
				w.notifyCallbacks(eventType, event.Name)

			case err, ok := <-w.watcher.Errors:
				if !ok {
					return
				}
				log.Printf("❌ File watcher error: %v", err)
			}
		}
	}()

	log.Println("✅ File watchers started successfully")
}

func (w *Watcher) notifyCallbacks(eventType, filePath string) {
	w.mu.Lock()
	callbacks := make([]FileChangeCallback, len(w.callbacks))
	copy(callbacks, w.callbacks)
	w.mu.Unlock()

	for _, callback := range callbacks {
		go func(cb FileChangeCallback) {
			defer func() {
				if r := recover(); r != nil {
					log.Printf("❌ Error in file change callback: %v", r)
				}
			}()
			cb(eventType, filePath)
		}(callback)
	}
}

// Stop stops watching for file changes
func (w *Watcher) Stop() error {
	log.Println("🛑 Stopping file watchers...")
	w.mu.Lock()
	w.running = false
	w.mu.Unlock()
	return w.watcher.Close()
}
