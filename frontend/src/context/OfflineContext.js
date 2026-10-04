import React, { createContext, useContext, useState, useEffect } from 'react';
import { openDB } from 'idb';

const OfflineContext = createContext();

export const OfflineProvider = ({ children }) => {
    const [db, setDb] = useState(null);
    const [pinnedItems, setPinnedItems] = useState([]);
    const [loading, setLoading] = useState(true);

    // ============================================================
    // Initialize IndexedDB
    // ============================================================
    useEffect(() => {
        const initDB = async () => {
            try {
                const database = await openDB('StudyAssistDB', 1, {
                    upgrade(db) {
                        if (!db.objectStoreNames.contains('notes')) {
                            const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
                            noteStore.createIndex('subjectId', 'subjectId');
                        }
                        if (!db.objectStoreNames.contains('pyqs')) {
                            const pyqStore = db.createObjectStore('pyqs', { keyPath: 'id' });
                            pyqStore.createIndex('subjectId', 'subjectId');
                        }
                        if (!db.objectStoreNames.contains('pinned')) {
                            db.createObjectStore('pinned', { keyPath: 'id' });
                        }
                    },
                });
                setDb(database);
                await loadPinnedItems(database);
                setLoading(false);
            } catch (error) {
                console.error('Error initializing IndexedDB:', error);
                setLoading(false);
            }
        };

        initDB();
    }, []);

    // ============================================================
    // Load pinned items
    // ============================================================
    const loadPinnedItems = async (database) => {
        try {
            const tx = database.transaction('pinned', 'readonly');
            const store = tx.objectStore('pinned');
            const items = await store.getAll();
            setPinnedItems(items);
        } catch (error) {
            console.error('Error loading pinned items:', error);
        }
    };

    // ============================================================
    // PIN ITEM - Stores PDF data in IndexedDB
    // ============================================================
    const pinItem = async (type, item) => {
        try {
            console.log('📌 Pinning item:', item._id);
            
            const storeName = type === 'note' ? 'notes' : 'pyqs';
            const tx = db.transaction([storeName, 'pinned'], 'readwrite');
            
            // ============================================================
            // FETCH THE ACTUAL PDF DATA
            // ============================================================
            let pdfData = null;
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(
                    `http://localhost:5000/api/upload/${type}/${item._id}?token=${token}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                    }
                );
                
                console.log('📄 Fetch response status:', response.status);
                
                if (response.ok) {
                    const pdfBlob = await response.blob();
                    console.log('📄 PDF blob size:', pdfBlob.size);
                    
                    pdfData = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = () => resolve(null);
                        reader.readAsDataURL(pdfBlob);
                    });
                    console.log('📄 PDF data fetched, length:', pdfData?.length || 0);
                } else {
                    console.warn('⚠️ Could not fetch PDF data, status:', response.status);
                }
            } catch (fetchError) {
                console.warn('⚠️ Error fetching PDF:', fetchError.message);
            }

            // ============================================================
            // STORE ITEM WITH PDF DATA
            // ============================================================
            const itemStore = tx.objectStore(storeName);
            const itemToStore = {
                ...item,
                id: item._id,
                type: type,
                pdfData: pdfData,
            };
            await itemStore.put(itemToStore);

            const pinnedStore = tx.objectStore('pinned');
            const pinnedData = {
                id: item._id,
                type: type,
                title: item.title,
                subjectId: item.subject,
                fileName: item.fileName,
                originalName: item.originalName,
                pdfData: pdfData,
                pinnedAt: new Date().toISOString(),
            };
            await pinnedStore.put(pinnedData);

            await tx.done;
            await loadPinnedItems(db);
            
            console.log('✅ Item pinned successfully with PDF data:', !!pdfData);
            return true;
        } catch (error) {
            console.error('Error pinning item:', error);
            return false;
        }
    };

    // ============================================================
    // UNPIN ITEM
    // ============================================================
    const unpinItem = async (id, type) => {
        try {
            const storeName = type === 'note' ? 'notes' : 'pyqs';
            const tx = db.transaction([storeName, 'pinned'], 'readwrite');
            
            const itemStore = tx.objectStore(storeName);
            await itemStore.delete(id);

            const pinnedStore = tx.objectStore('pinned');
            await pinnedStore.delete(id);

            await tx.done;
            await loadPinnedItems(db);
            console.log('🗑️ Item unpinned successfully');
            return true;
        } catch (error) {
            console.error('Error unpinning item:', error);
            return false;
        }
    };

    // ============================================================
    // CHECK IF PINNED
    // ============================================================
    const isPinned = (id) => {
        return pinnedItems.some(item => item.id === id);
    };

    // ============================================================
    // GET PINNED ITEM FROM INDEXEDDB
    // ============================================================
    const getPinnedItem = async (id, type) => {
        try {
            const storeName = type === 'note' ? 'notes' : 'pyqs';
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const item = await store.get(id);
            
            console.log('📄 Retrieved from IndexedDB:', item ? 'Found' : 'Not found');
            console.log('📄 Has pdfData:', !!item?.pdfData);
            
            if (item) {
                const { id: _, ...rest } = item;
                return { ...rest, _id: item.id };
            }
            return null;
        } catch (error) {
            console.error('Error getting pinned item:', error);
            return null;
        }
    };

    // ============================================================
    // GET ALL PINNED ITEMS FOR A SUBJECT
    // ============================================================
    const getPinnedItemsForSubject = (subjectId) => {
        return pinnedItems.filter(item => item.subjectId === subjectId);
    };

    // ============================================================
    // VALUE OBJECT
    // ============================================================
    const value = {
        loading,
        pinnedItems,
        pinItem,
        unpinItem,
        isPinned,
        getPinnedItem,
        getPinnedItemsForSubject,
    };

    return (
        <OfflineContext.Provider value={value}>
            {children}
        </OfflineContext.Provider>
    );
};

export const useOffline = () => {
    const context = useContext(OfflineContext);
    if (!context) {
        throw new Error('useOffline must be used within an OfflineProvider');
    }
    return context;
};

export default OfflineContext;