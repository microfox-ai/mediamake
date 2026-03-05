"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Upload,
    Search,
    FileVideo,
    FileAudio,
    Image,
    ExternalLink,
    Download,
    Trash2,
    Edit,
    Plus,
    Filter,
    FileText,
    SortAsc,
    SortDesc,
    X,
    Grid3X3,
    List,
    Check,
    X as XIcon,
    Loader2,
    GlobeIcon
} from "lucide-react";
import { MediaFile, Tag } from "@/app/types/media";
import { UploadTrigger } from "@/components/ui/upload-trigger";
import { UrlIndexingTrigger } from "@/components/ui/url-indexing-trigger";
import { WebRecorderTrigger } from "@/components/ui/web-recorder-trigger";
import { MediaGrid, MediaOptionsDropdown } from "./media-ui";
import useSWR from "swr";
import { MediaSidebar } from "./media-sidebar";
import { useMedia } from "./media-context";
import { useSession } from "@/components/session-provider";
import { MediaEditDialog } from "./media-edit-dialog";
import { BulkEditToolbar } from "./bulk-edit-toolbar";
import { toast } from "sonner";

// Pagination component
interface PaginationProps {
    currentPage: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange }: PaginationProps) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const [pageInput, setPageInput] = useState(currentPage.toString());

    // Update input when currentPage changes externally
    useEffect(() => {
        setPageInput(currentPage.toString());
    }, [currentPage]);

    if (totalPages <= 1) {
        return null;
    }

    const handlePrevious = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };

    const handlePageInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const pageNum = parseInt(pageInput, 10);
            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                onPageChange(pageNum);
            } else {
                // Reset to current page if invalid
                setPageInput(currentPage.toString());
            }
        }
    };

    const handlePageInputBlur = () => {
        // Reset to current page if input is invalid or empty
        const pageNum = parseInt(pageInput, 10);
        if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
            setPageInput(currentPage.toString());
        }
    };

    const getPageNumbers = () => {
        const pageNumbers: (number | string)[] = [];
        const maxPagesToShow = 5;
        const halfPagesToShow = Math.floor(maxPagesToShow / 2);

        if (totalPages <= maxPagesToShow + 2) {
            for (let i = 1; i <= totalPages; i++) {
                pageNumbers.push(i);
            }
        } else {
            if (currentPage <= halfPagesToShow + 1) {
                for (let i = 1; i <= maxPagesToShow; i++) {
                    pageNumbers.push(i);
                }
                pageNumbers.push('...');
                pageNumbers.push(totalPages);
            } else if (currentPage >= totalPages - halfPagesToShow) {
                pageNumbers.push(1);
                pageNumbers.push('...');
                for (let i = totalPages - maxPagesToShow + 1; i <= totalPages; i++) {
                    pageNumbers.push(i);
                }
            } else {
                pageNumbers.push(1);
                pageNumbers.push('...');
                for (let i = currentPage - halfPagesToShow; i <= currentPage + halfPagesToShow; i++) {
                    pageNumbers.push(i);
                }
                pageNumbers.push('...');
                pageNumbers.push(totalPages);
            }
        }
        return pageNumbers;
    };

    const pageNumbers = getPageNumbers();

    return (
        <div className="flex items-center justify-between mt-4 p-2 border-t">
            <span className="text-sm text-muted-foreground">
                Total results: {totalItems}
            </span>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrevious} disabled={currentPage === 1}>
                    Previous
                </Button>
                {pageNumbers.map((page, index) =>
                    typeof page === 'number' ? (
                        <Button
                            key={index}
                            variant={currentPage === page ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => onPageChange(page)}
                        >
                            {page}
                        </Button>
                    ) : (
                        <span key={index} className="px-2 py-1 text-sm">
                            {page}
                        </span>
                    )
                )}
                <div className="flex items-center gap-1 px-2">
                    <span className="text-xs text-muted-foreground">Go to</span>
                    <Input
                        type="number"
                        min={1}
                        max={totalPages}
                        value={pageInput}
                        onChange={(e) => setPageInput(e.target.value)}
                        onKeyPress={handlePageInputKeyPress}
                        onBlur={handlePageInputBlur}
                        className="w-12 h-8 text-center text-sm"
                        placeholder={currentPage.toString()}
                    />
                </div>
                <Button variant="outline" size="sm" onClick={handleNext} disabled={currentPage === totalPages}>
                    Next
                </Button>
            </div>
        </div>
    );
}

interface MediaPickerProps {
    pickerMode?: boolean;
    singular?: boolean;
    onSelect?: (files: MediaFile | MediaFile[]) => void;
    onClose?: () => void;
    selectedTag?: string | null;
    selectedProjectId?: string | null;
    selectedFile?: MediaFile | null;
    onSelectFile?: (file: MediaFile | null) => void;
    tagToAddToHashtags?: string | null | "CLEAR_ALL";
    onTagAddedToHashtags?: () => void;
    hashtagFilters?: string[];
    onHashtagFiltersChange?: (filters: string[]) => void;
    showSidebar?: boolean;
    /** Optional handler to clear the selected tag filter from parent (dashboard media page) */
    onClearSelectedTag?: () => void;
}

// Content source options for filtering
const CONTENT_SOURCES = {
    pinterest: "Pinterest",
    midjourney: "Midjourney",
    youtube: "YouTube",
    upload: "Upload",
    web: "Web",
    instagram: "Instagram",
    tiktok: "TikTok",
    webrecorder: "Web Recorder"
} as const;

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url).then(res => res.json());

export function MediaPicker({
    pickerMode = false,
    singular = false,
    onSelect,
    onClose,
    selectedTag: propSelectedTag,
    selectedProjectId: propSelectedProjectId,
    selectedFile: propSelectedFile,
    onSelectFile: propOnSelectFile,
    tagToAddToHashtags: propTagToAddToHashtags,
    onTagAddedToHashtags: propOnTagAddedToHashtags,
    hashtagFilters: propHashtagFilters,
    onHashtagFiltersChange: propOnHashtagFiltersChange,
    showSidebar = true,
    onClearSelectedTag,
}: MediaPickerProps) {
    const {
        selectedTag: contextSelectedTag,
        setSelectedTag: setContextSelectedTag,
        hashtagFilters: contextHashtagFilters,
        setHashtagFilters: setContextHashtagFilters,
        addHashtagFilter: contextAddHashtagFilter,
        removeHashtagFilter: contextRemoveHashtagFilter,
        selectedFile: contextSelectedFile,
        setSelectedFile: setContextSelectedFile,
        selectedFiles: contextSelectedFiles,
        setSelectedFiles: setContextSelectedFiles
    } = useMedia();

    const session = useSession();
    const selectedTag = propSelectedTag ?? contextSelectedTag;
    const selectedProjectId = propSelectedProjectId ?? null;
    const selectedFile = propSelectedFile ?? contextSelectedFile;
    const hashtagFilters = propHashtagFilters ?? contextHashtagFilters;
    const selectedFiles = contextSelectedFiles;

    // Picker-specific state
    const [tagToAddToHashtags, setTagToAddToHashtags] = useState<string | null | "CLEAR_ALL">(propTagToAddToHashtags || null);
    const [searchQuery, setSearchQuery] = useState("");
    const [contentTypeFilter, setContentTypeFilter] = useState<string>("all");
    const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest");
    const [hashtagInput, setHashtagInput] = useState("");
    const [contentSourceFilter, setContentSourceFilter] = useState<string>("all");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(30);

    const [searchProjects, setSearchProjects] = useState<{ id: string; displayName: string }[]>([]);
    const [selectedSearchProjectId, setSelectedSearchProjectId] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<MediaFile[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isClientSearch, setIsClientSearch] = useState(true);

    // Edit functionality state
    const [editMode, setEditMode] = useState(false);
    const [bulkSelectedFiles, setBulkSelectedFiles] = useState<Set<string>>(new Set());
    const [editingFile, setEditingFile] = useState<MediaFile | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isPicking, setIsPicking] = useState(false);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, contentTypeFilter, sortOrder, hashtagFilters, contentSourceFilter, selectedTag, selectedProjectId]);

    useEffect(() => {
        const headers: Record<string, string> = {};
        if (session?.clientId) headers["x-client-id"] = session.clientId;
        fetch("/api/project", { headers })
            .then((res) => (res.ok ? res.json() : []))
            .then((data) => (Array.isArray(data) ? setSearchProjects(data) : setSearchProjects([])))
            .catch(() => setSearchProjects([]));
    }, [session?.clientId]);

    useEffect(() => {
        setSelectedSearchProjectId(selectedProjectId);
    }, [selectedProjectId]);

    const performGlobalSearch = async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const searchType = isClientSearch ? 'clientFiles' : 'mediaFiles';
            const params = new URLSearchParams({
                q: query,
                searchType,
                topK: '50',
            });
            if (hashtagFilters.length > 0) {
                params.append('tags', hashtagFilters.join(','));
            }
            if (selectedSearchProjectId && selectedSearchProjectId !== 'default') {
                params.append('projectId', selectedSearchProjectId);
                const proj = searchProjects.find((p) => p.id === selectedSearchProjectId);
                if (proj?.displayName) params.append('projectDisplayName', proj.displayName);
            } else {
                params.append('projectId', 'default');
            }

            const response = await fetch(`/api/sparkboard/search?${params}`);
            if (!response.ok) {
                throw new Error('Search failed');
            }

            const data = await response.json();
            setSearchResults(data.data?.results || []);
        } catch (error) {
            console.error('Search error:', error);
            toast.error('Search failed');
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    // Handle search on Enter key press
    const handleSearchKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            performGlobalSearch(searchQuery);
        }
    };

    // Clear search results and query
    const clearSearch = () => {
        setSearchResults([]);
        setSearchQuery("");
        setIsSearching(false);
    };

    // Focus management for picker mode
    useEffect(() => {
        if (pickerMode) {
            // Focus the dialog container to capture keyboard events
            const dialogElement = document.querySelector('[data-media-picker-dialog]') as HTMLElement;
            if (dialogElement) {
                dialogElement.focus();
            }
        }
    }, [pickerMode]);

    const buildApiUrl = () => {
        const params = new URLSearchParams();
        if (selectedTag) params.append('tag', selectedTag);
        if (selectedProjectId) params.append('projectId', selectedProjectId);
        if (contentTypeFilter !== 'all') params.append('contentType', contentTypeFilter);
        if (contentSourceFilter !== 'all') params.append('contentSource', contentSourceFilter);
        if (hashtagFilters.length > 0) {
            params.append('tags', hashtagFilters.join(','));
        }
        params.append('sort', 'createdAt');
        params.append('order', sortOrder === 'latest' ? 'desc' : 'asc');
        params.append('page', currentPage.toString());
        params.append('limit', itemsPerPage.toString());
        return `/api/media-files?${params}`;
    };

    const isTagMode = Boolean(selectedTag);
    const filesKey = searchResults.length > 0 ? null : buildApiUrl();
    const filesFetcher = fetcher;

    const { data: filesData, error: filesError, mutate: mutateFiles } = useSWR(
        filesKey,
        filesFetcher
    );
    const { data: tagsData, error: tagsError } = useSWR('/api/tags', fetcher);

    const files = searchResults.length > 0 ? searchResults : (filesData?.files || []);
    const totalCount = searchResults.length > 0 ? searchResults.length : (filesData?.total || 0);
    const hasMore = searchResults.length > 0 ? false : (filesData?.hasMore || false);
    const tags = tagsData || [];
    const isLoading = searchResults.length > 0 ? isSearching : (!filesData && !filesError);


    const getTagDisplayName = (tagId: string) => {
        const tag = tags.find((t: Tag) => t.id === tagId);
        return tag ? tag.displayName : tagId;
    };

    // Hashtag filter functions
    const addHashtagFilter = (tag: string) => {
        if (tag.trim() && !hashtagFilters.includes(tag.trim())) {
            const newFilters = [...hashtagFilters, tag.trim()];
            setContextHashtagFilters(newFilters);
            propOnHashtagFiltersChange?.(newFilters);
        }
    };

    const removeHashtagFilter = (tag: string) => {
        const newFilters = hashtagFilters.filter(t => t !== tag);
        setContextHashtagFilters(newFilters);
        propOnHashtagFiltersChange?.(newFilters);
    };

    const handleHashtagInputKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addHashtagFilter(hashtagInput);
            setHashtagInput("");
        }
    };

    const handleHashtagInputBlur = () => {
        if (hashtagInput.trim()) {
            addHashtagFilter(hashtagInput);
            setHashtagInput("");
        }
    };

    const handleTagSelection = (tagId: string | null) => {
        if (tagId) {
            setTagToAddToHashtags(tagId);
            setContextSelectedTag(tagId);
            setContextHashtagFilters([tagId]);
        } else {
            setTagToAddToHashtags("CLEAR_ALL");
            setContextSelectedTag(null);
            setContextHashtagFilters([]);
        }
        setContextSelectedFile(null);
    };

    const handleHashtagFiltersChange = (filters: string[]) => {
        setContextHashtagFilters(filters);
        propOnHashtagFiltersChange?.(filters);
    };

    // Handle tag selection from sidebar - replace all hashtag filters
    useEffect(() => {
        if (tagToAddToHashtags === "CLEAR_ALL") {
            setContextHashtagFilters([]);
            propOnTagAddedToHashtags?.();
        } else if (tagToAddToHashtags) {
            setContextHashtagFilters([tagToAddToHashtags]);
            propOnTagAddedToHashtags?.();
        }
    }, [tagToAddToHashtags, propOnTagAddedToHashtags]);

    const getContentTypeIcon = (contentType: string) => {
        switch (contentType) {
            case 'video':
                return <FileVideo className="h-5 w-5" />;
            case 'audio':
                return <FileAudio className="h-5 w-5" />;
            case 'image':
                return <Image className="h-5 w-5" />;
            case 'document':
                return <FileText className="h-5 w-5" />;
            default:
                return <FileVideo className="h-5 w-5" />;
        }
    };

    const handleCopyUrl = (file: MediaFile) => {
        if (file.filePath) {
            navigator.clipboard.writeText(file.filePath);
        }
    };

    const handleCopyId = (file: MediaFile) => {
        if (file._id) {
            navigator.clipboard.writeText(file._id.toString());
        }
    };

    const handleEditDetails = (file: MediaFile) => {
        setEditingFile(file);
    };

    // Bulk operations
    const handleBulkSelectAll = () => {
        const allFileIds = files.map((file: MediaFile) => file._id?.toString()).filter(Boolean) as string[];
        setBulkSelectedFiles(new Set(allFileIds));
    };

    const handleBulkDeselectAll = () => {
        setBulkSelectedFiles(new Set());
    };

    const handleBulkFileSelect = (fileId: string, selected: boolean) => {
        const newSelection = new Set(bulkSelectedFiles);
        if (selected) {
            newSelection.add(fileId);
        } else {
            newSelection.delete(fileId);
        }
        setBulkSelectedFiles(newSelection);
    };

    const handleBulkUpdate = async (fileIds: string[], operation: 'add' | 'remove' | 'replace', tags: string[]) => {
        try {
            setIsUpdating(true);
            const response = await fetch('/api/media-files/bulk', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fileIds,
                    operation,
                    tags
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update files');
            }

            // Refresh the files data
            await mutateFiles();
            toast.success(`Updated ${fileIds.length} file${fileIds.length > 1 ? 's' : ''}`);
        } catch (error) {
            console.error('Error in bulk update:', error);
            toast.error('Failed to update files');
            throw error;
        } finally {
            setIsUpdating(false);
        }
    };

    const handleSaveFile = async (fileId: string, updates: { tags: string[]; fileName?: string }) => {
        try {
            setIsUpdating(true);
            const response = await fetch(`/api/media-files/${fileId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
            });

            if (!response.ok) {
                throw new Error('Failed to update file');
            }

            // Refresh the files data
            await mutateFiles();
        } catch (error) {
            console.error('Error updating file:', error);
            toast.error('Failed to update file');
            throw error;
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteMedia = async (file: MediaFile) => {
        if (confirm('Are you sure you want to delete this media file?')) {
            try {
                const response = await fetch(`/api/media-files/${file._id}`, {
                    method: 'DELETE',
                });
                if (response.ok) {
                    mutateFiles();
                }
            } catch (error) {
                console.error('Error deleting media:', error);
            }
        }
    };

    // Picker-specific functions
    const handleFileSelection = (file: MediaFile) => {
        if (!pickerMode) {
            setContextSelectedFile(file);
            propOnSelectFile?.(file);
            return;
        }

        const fileId = file._id?.toString();
        if (!fileId) return;

        if (singular) {
            // Singular mode - select and close immediately
            onSelect?.(file);
            onClose?.();
            return;
        }

        // Multi-select mode
        const newSelectedFiles = new Set(selectedFiles);
        if (newSelectedFiles.has(fileId)) {
            newSelectedFiles.delete(fileId);
        } else {
            newSelectedFiles.add(fileId);
        }
        setContextSelectedFiles(newSelectedFiles);
    };

    const handlePickItems = async () => {
        if (selectedFiles.size === 0) return;

        try {
            setIsPicking(true);
            // Fetch all selected files by their IDs
            const selectedFileIds = Array.from(selectedFiles);
            const response = await fetch(`/api/media-files?ids=${selectedFileIds.join(',')}`);

            if (!response.ok) {
                throw new Error('Failed to fetch selected files');
            }

            const data = await response.json();
            const selectedFilesArray = data.files || [];

            onSelect?.(selectedFilesArray);
            onClose?.();
        } catch (error) {
            console.error('Error fetching selected files:', error);
            toast.error('Failed to fetch selected files');
        } finally {
            setIsPicking(false);
        }
    };

    const clearSelection = () => {
        setContextSelectedFiles(new Set());
    };

    const visibleFileIds = useMemo(() =>
        files
            .map((file: MediaFile) => file._id?.toString())
            .filter((id: string | undefined): id is string => !!id),
        [files]
    );

    const allVisibleSelected = useMemo(() =>
        visibleFileIds.length > 0 && visibleFileIds.every((id: string) => selectedFiles.has(id)),
        [visibleFileIds, selectedFiles]
    );

    const selectAllVisible = () => {
        if (!pickerMode) return;

        const newSelectedFiles = new Set(selectedFiles);
        if (allVisibleSelected) {
            // Deselect all visible
            visibleFileIds.forEach((id: string) => newSelectedFiles.delete(id));
        } else {
            // Select all visible
            visibleFileIds.forEach((id: string) => newSelectedFiles.add(id));
        }
        setContextSelectedFiles(newSelectedFiles);
    };

    const containerClasses = pickerMode
        ? "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
        : "flex-1 bg-background";

    const contentClasses = pickerMode
        ? "fixed right-0 top-0 h-full w-[80vw] md:w-[80vw] bg-background border-l shadow-lg z-50"
        : "flex-1 bg-background";

    const pickerContent = (
        <div className={containerClasses}>
            {pickerMode && (
                <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
            )}
            <div
                className={contentClasses}
                data-media-picker-dialog
                tabIndex={-1}
                onKeyDown={(e) => {
                    // Handle escape key to close
                    if (e.key === 'Escape' && pickerMode) {
                        onClose?.();
                    }
                }}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-4 border-b bg-muted/30">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-semibold">
                                    {pickerMode
                                        ? "Select Media"
                                        : (selectedTag
                                            ? `Files tagged with "${getTagDisplayName(selectedTag)}"`
                                            : 'All Files')}
                                </h2>
                                {!pickerMode && selectedTag && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                        title="Clear tag filter"
                                        onClick={() => {
                                            // Clear tag filter in parent page if handler provided,
                                            // otherwise fall back to clearing hashtag filters only.
                                            if (onClearSelectedTag) {
                                                onClearSelectedTag();
                                            } else {
                                                setContextSelectedTag(null);
                                                const newFilters = hashtagFilters.filter(t => t !== selectedTag);
                                                setContextHashtagFilters(newFilters);
                                                propOnHashtagFiltersChange?.(newFilters);
                                            }
                                        }}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                )}
                                {!pickerMode && searchResults.length > 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="ml-2 h-7 px-2 text-xs"
                                        onClick={clearSearch}
                                    >
                                        Exit search (back to list)
                                    </Button>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {!pickerMode && (
                                    <Button
                                        variant={editMode ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => {
                                            setEditMode(!editMode);
                                            if (editMode) {
                                                setBulkSelectedFiles(new Set());
                                            }
                                        }}
                                    >
                                        <Edit className="h-4 w-4 mr-2" />
                                        {editMode ? 'Exit Edit' : 'Edit Mode'}
                                    </Button>
                                )}
                                <UploadTrigger
                                    autoUpload={true}
                                    onUploadComplete={() => {
                                        mutateFiles();
                                    }}
                                    preselectedTags={hashtagFilters}
                                    pickerMode={pickerMode}
                                    selectedProjectId={selectedProjectId}
                                />
                                {pickerMode && (
                                    <Button variant="ghost" size="sm" onClick={onClose}>
                                        <XIcon className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="flex items-center justify-between gap-4">
                            {/* Left Side - Hashtag Filters */}
                            <div className="flex items-center gap-2 flex-1">
                                <span className="text-sm font-medium text-muted-foreground">Tags:</span>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {hashtagFilters.map((tag) => (
                                        <Badge
                                            key={tag}
                                            variant="secondary"
                                            className="flex items-center gap-1 cursor-pointer hover:bg-destructive/10 transition-colors"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                removeHashtagFilter(tag);
                                            }}
                                        >
                                            #{tag}
                                            <X className="h-3 w-3 hover:text-destructive" />
                                        </Badge>
                                    ))}
                                    <Input
                                        placeholder="Add hashtag..."
                                        value={hashtagInput}
                                        onChange={(e) => setHashtagInput(e.target.value)}
                                        onKeyPress={handleHashtagInputKeyPress}
                                        onBlur={handleHashtagInputBlur}
                                        className="w-32 h-8 text-xs"
                                    />
                                </div>
                            </div>

                            {/* Right Side - Other Filters */}
                            <div className="flex items-center gap-3">
                                {/* Search */}
                                <div className="relative flex items-center">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search files... (Press Enter)"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyPress={handleSearchKeyPress}
                                        className="pl-10 pr-16 w-48"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            if (searchResults.length > 0) {
                                                clearSearch();
                                            } else {
                                                performGlobalSearch(searchQuery);
                                            }
                                        }}
                                        disabled={isSearching || (!searchQuery.trim() && searchResults.length === 0)}
                                        className="absolute right-8 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                        title={searchResults.length > 0 ? "Clear search" : "Search"}
                                    >
                                        {isSearching ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : searchResults.length > 0 ? (
                                            <X className="h-3 w-3" />
                                        ) : (
                                            <Search className="h-3 w-3" />
                                        )}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setIsClientSearch(!isClientSearch);
                                            clearSearch();
                                        }}
                                        className={`absolute right-1 h-6 w-6 p-0 ${!isClientSearch
                                            ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                                            : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                        title={!isClientSearch ? "Switch to client search" : "Switch to global search"}
                                    >
                                        <GlobeIcon className="h-3 w-3" />
                                    </Button>
                                </div>

                                {/* Project filter for search */}
                                <Select
                                    value={selectedSearchProjectId ?? 'stocksearch'}
                                    onValueChange={(v) => setSelectedSearchProjectId(v === 'stocksearch' ? null : v)}
                                >
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="Project" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="stocksearch">Stocksearch</SelectItem>
                                        {searchProjects.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.displayName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Content Type Filter */}
                                <Select value={contentTypeFilter} onValueChange={setContentTypeFilter}>
                                    <SelectTrigger className="w-24">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        <SelectItem value="video">Video</SelectItem>
                                        <SelectItem value="audio">Audio</SelectItem>
                                        <SelectItem value="image">Image</SelectItem>
                                        <SelectItem value="document">Document</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Content Source Filter */}
                                <Select value={contentSourceFilter} onValueChange={setContentSourceFilter}>
                                    <SelectTrigger className="w-24">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Sources</SelectItem>
                                        {Object.entries(CONTENT_SOURCES).map(([key, value]) => (
                                            <SelectItem key={key} value={key}>{value}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Sort Order */}
                                <Select value={sortOrder} onValueChange={(value: "latest" | "oldest") => setSortOrder(value)}>
                                    <SelectTrigger className="w-24">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="latest">
                                            <div className="flex items-center gap-2">
                                                <SortDesc className="h-4 w-4" />
                                                Latest
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="oldest">
                                            <div className="flex items-center gap-2">
                                                <SortAsc className="h-4 w-4" />
                                                Oldest
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* View Mode Toggle */}
                                <div className="flex items-center border rounded-md">
                                    <Button
                                        variant={viewMode === "grid" ? "default" : "ghost"}
                                        size="sm"
                                        onClick={() => setViewMode("grid")}
                                        className="rounded-r-none border-r"
                                    >
                                        <Grid3X3 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant={viewMode === "list" ? "default" : "ghost"}
                                        size="sm"
                                        onClick={() => setViewMode("list")}
                                        className="rounded-l-none"
                                    >
                                        <List className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* All Tags Horizontal List */}
                        {tags.length > 0 && (
                            <div className="mt-4 flex flex-col">
                                <div className="overflow-x-auto pb-2 min-w-0">
                                    <div className="flex items-center gap-2">
                                        {tags.map((tag: Tag) => (
                                            <Badge
                                                key={tag.id}
                                                variant={hashtagFilters.includes(tag.id) ? "default" : "outline"}
                                                className="flex items-center gap-1 cursor-pointer hover:bg-primary/10 transition-colors whitespace-nowrap"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (hashtagFilters.includes(tag.id)) {
                                                        removeHashtagFilter(tag.id);
                                                    } else {
                                                        addHashtagFilter(tag.id);
                                                    }
                                                }}
                                            >
                                                #{tag.displayName}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex flex-1 overflow-hidden">
                        {!pickerMode && showSidebar && (
                            <MediaSidebar
                                selectedTag={selectedTag}
                                onSelectTag={handleTagSelection}
                                hashtagFilters={hashtagFilters}
                                onHashtagFiltersChange={handleHashtagFiltersChange}
                            />
                        )}
                        <div className="flex-1 overflow-hidden">
                            <div className="p-4 h-full overflow-auto">

                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    <div className="col-span-1">
                                        <UrlIndexingTrigger
                                            uiType="dropzone"
                                            onIndexingComplete={() => {
                                                mutateFiles();
                                            }}
                                            dropzoneClassName="min-h-[200px]"
                                            preselectedTags={hashtagFilters}
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <UploadTrigger
                                            autoUpload={true}
                                            uiType="dropzone"
                                            onUploadComplete={() => {
                                                mutateFiles();
                                            }}
                                            dropzoneClassName="min-h-[200px]"
                                            preselectedTags={hashtagFilters}
                                            pickerMode={pickerMode}
                                            selectedProjectId={selectedProjectId}
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <WebRecorderTrigger
                                            uiType="dropzone"
                                            onRecordingComplete={() => {
                                                mutateFiles();
                                            }}
                                            dropzoneClassName="min-h-[200px]"
                                            preselectedTags={hashtagFilters}
                                        />
                                    </div>
                                </div>
                                {/* Search Indicator */}
                                {searchResults.length > 0 && (
                                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <div className="flex items-center justify-between text-sm text-blue-700">
                                            <div className="flex items-center gap-2">
                                                <ExternalLink className="h-4 w-4" />
                                                <span>
                                                    {isClientSearch ? 'Client' : 'Global'} search results - showing {searchResults.length} results
                                                    {hashtagFilters.length > 0 && ` (filtered by: ${hashtagFilters.join(', ')})`}
                                                </span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={clearSearch}
                                                className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                                                title="Clear search results"
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Bulk Edit Toolbar */}
                                {editMode && (
                                    <BulkEditToolbar
                                        selectedFiles={bulkSelectedFiles}
                                        onClearSelection={handleBulkDeselectAll}
                                        onBulkUpdate={handleBulkUpdate}
                                        isUpdating={isUpdating}
                                    />
                                )}

                                {isLoading ? (
                                    <div className="text-center text-muted-foreground py-8">
                                        Loading files...
                                    </div>
                                ) : files.length === 0 ? (
                                    <div className="text-center text-muted-foreground py-8">
                                        {searchQuery ? (
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="text-lg">No search results found</div>
                                                <div className="text-sm">Try different keywords or clear the search</div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={clearSearch}
                                                    className="mt-2"
                                                >
                                                    Clear Search
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        {viewMode === "grid" ? (
                                            <MediaGrid
                                                mediaFiles={files}
                                                onEditDetails={handleEditDetails}
                                                onCopyUrl={handleCopyUrl}
                                                onCopyId={handleCopyId}
                                                onDeleteMedia={handleDeleteMedia}
                                                pickerMode={pickerMode}
                                                selectedFiles={selectedFiles}
                                                onFileSelect={handleFileSelection}
                                                editMode={editMode}
                                                onBulkSelect={handleBulkSelectAll}
                                                onBulkSelectAll={handleBulkSelectAll}
                                                onBulkDeselectAll={handleBulkDeselectAll}
                                                bulkSelectedFiles={bulkSelectedFiles}
                                                onBulkFileSelect={handleBulkFileSelect}
                                            />
                                        ) : (
                                            <div className="space-y-2">
                                                {files.map((file: MediaFile) => {
                                                    const fileId = file._id?.toString();
                                                    const isSelected = pickerMode ? selectedFiles.has(fileId || '') : selectedFile?._id === file._id;
                                                    const isPickerSelected = pickerMode && selectedFiles.has(fileId || '');

                                                    return (
                                                        <Card
                                                            key={file._id?.toString()}
                                                            className={`cursor-pointer transition-colors ${isSelected ? 'ring-2 ring-primary' : ''
                                                                } ${isPickerSelected ? 'bg-primary/10' : ''}`}
                                                            onClick={() => handleFileSelection(file)}
                                                        >
                                                            <CardContent className="p-4">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-4">
                                                                        {pickerMode && (
                                                                            <div className="flex items-center justify-center w-6 h-6">
                                                                                {isPickerSelected && (
                                                                                    <Check className="h-5 w-5 text-primary" />
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                        {getContentTypeIcon(file.contentType)}
                                                                        <div className="flex-1">
                                                                            <h3 className="font-medium">{file.fileName || 'Untitled'}</h3>
                                                                            <p className="text-sm text-muted-foreground">
                                                                                {file.contentType} • {new Date(file.createdAt).toLocaleDateString()}
                                                                            </p>
                                                                            <div className="flex flex-wrap gap-1 mt-2">
                                                                                {file.tags.map((tagId: string) => (
                                                                                    <span
                                                                                        key={tagId}
                                                                                        className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            console.log('Filter by tag:', tagId);
                                                                                        }}
                                                                                    >
                                                                                        #{getTagDisplayName(tagId)}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    {!pickerMode && (
                                                                        <MediaOptionsDropdown
                                                                            mediaFile={file}
                                                                            onEditDetails={handleEditDetails}
                                                                            onCopyUrl={handleCopyUrl}
                                                                            onCopyId={handleCopyId}
                                                                            onDeleteMedia={handleDeleteMedia}
                                                                        />
                                                                    )}
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {totalCount > 0 && (
                                    <Pagination
                                        currentPage={currentPage}
                                        totalItems={totalCount}
                                        itemsPerPage={itemsPerPage}
                                        onPageChange={setCurrentPage}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Picker Bottom Bar */}
                    {pickerMode && !singular && (
                        <div className="border-t bg-muted/30 p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-muted-foreground">
                                        {selectedFiles.size} item{selectedFiles.size !== 1 ? 's' : ''} selected
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={selectAllVisible}>
                                            {allVisibleSelected ? 'Deselect All Visible' : 'Select All Visible'}
                                        </Button>
                                        {selectedFiles.size > 0 && (
                                            <Button variant="ghost" size="sm" onClick={clearSelection}>
                                                Clear Selection
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" onClick={onClose}>
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handlePickItems}
                                        disabled={selectedFiles.size === 0 || isPicking}
                                    >
                                        {isPicking ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                Picking...
                                            </>
                                        ) : (
                                            `Pick Items (${selectedFiles.size})`
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Media Edit Dialog */}
            <MediaEditDialog
                isOpen={!!editingFile}
                onClose={() => setEditingFile(null)}
                mediaFile={editingFile}
                onSave={handleSaveFile}
            />
        </div>
    );

    // Use portal for picker mode to escape sidebar z-index constraints
    if (pickerMode && typeof window !== 'undefined') {
        return createPortal(pickerContent, document.body);
    }

    return pickerContent;
}
