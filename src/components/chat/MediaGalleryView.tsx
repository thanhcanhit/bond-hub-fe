"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Media } from "@/types/base";
import Image from "next/image";
import { getLinkIcon, getLinkTitle } from "@/utils/link-utils";

interface MediaGalleryViewProps {
  mediaFiles: (Media & { createdAt: Date })[];
  documents?: (Media & { createdAt: Date })[];
  links?: { url: string; title: string; timestamp: Date }[];
  initialTab?: TabType;
  onClose: () => void;
}

type SortOption = "date" | "sender";
type TabType = "media" | "files" | "links";

interface MediaByDate {
  date: string;
  media: (Media & { createdAt: Date })[];
}

export default function MediaGalleryView({
  mediaFiles,
  documents = [],
  links = [],
  initialTab = "media",
  onClose,
}: MediaGalleryViewProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [mediaByDate, setMediaByDate] = useState<MediaByDate[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [documentsByDate, setDocumentsByDate] = useState<MediaByDate[]>([]);
  const [linksByDate, setLinksByDate] = useState<
    { date: string; links: { url: string; title: string; timestamp: Date }[] }[]
  >([]);

  // Search states
  const [fileSearchTerm, setFileSearchTerm] = useState("");
  const [linkSearchTerm, setLinkSearchTerm] = useState("");
  const [filteredDocumentsByDate, setFilteredDocumentsByDate] = useState<
    MediaByDate[]
  >([]);
  const [filteredLinksByDate, setFilteredLinksByDate] = useState<
    { date: string; links: { url: string; title: string; timestamp: Date }[] }[]
  >([]);

  // Format date for header (e.g., "Ngày 16 Tháng 4")
  const formatDateHeader = (date: Date): string => {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `Ngày ${day} Tháng ${month}`;
  };

  // Group media by date
  useEffect(() => {
    const groupMediaByDate = () => {
      const groups: { [key: string]: (Media & { createdAt: Date })[] } = {};

      // Sort media files by date (newest first)
      const sortedMedia = [...mediaFiles].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );

      sortedMedia.forEach((media) => {
        const date = formatDateHeader(media.createdAt);
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(media);
      });

      // Convert to array format for rendering
      const result: MediaByDate[] = Object.keys(groups).map((date) => ({
        date,
        media: groups[date],
      }));

      setMediaByDate(result);
    };

    groupMediaByDate();
  }, [mediaFiles]);

  // Group documents by date
  useEffect(() => {
    const groupDocumentsByDate = () => {
      const groups: { [key: string]: (Media & { createdAt: Date })[] } = {};

      // Sort documents by date (newest first)
      const sortedDocuments = [...documents].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );

      sortedDocuments.forEach((doc) => {
        const date = formatDateHeader(doc.createdAt);
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(doc);
      });

      // Convert to array format for rendering
      const result: MediaByDate[] = Object.keys(groups).map((date) => ({
        date,
        media: groups[date],
      }));

      setDocumentsByDate(result);
      setFilteredDocumentsByDate(result); // Initialize filtered documents with all documents
    };

    groupDocumentsByDate();
  }, [documents]);

  // Group links by date
  useEffect(() => {
    const groupLinksByDate = () => {
      const groups: {
        [key: string]: { url: string; title: string; timestamp: Date }[];
      } = {};

      // Sort links by date (newest first)
      const sortedLinks = [...links].sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      );

      sortedLinks.forEach((link) => {
        const date = formatDateHeader(link.timestamp);
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(link);
      });

      // Convert to array format for rendering
      const result = Object.keys(groups).map((date) => ({
        date,
        links: groups[date],
      }));

      setLinksByDate(result);
      setFilteredLinksByDate(result); // Initialize filtered links with all links
    };

    groupLinksByDate();
  }, [links]);

  return (
    <div className="flex flex-col bg-white h-full w-full">
      {/* Header */}
      <div className="p-4 flex  items-center justify-between border-b">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2"
            onClick={onClose}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="font-semibold">Kho lưu trữ</h2>
        </div>
        <Button variant="ghost" size="sm" className="text-sm">
          Chọn
        </Button>
      </div>

      {/* Tab buttons */}
      <div className="w-full grid grid-cols-3 border-b rounded-none h-12 flex-shrink-0">
        <button
          onClick={() => setActiveTab("media")}
          className={`text-sm ${activeTab === "media" ? "border-b-2 border-blue-500 font-medium" : ""}`}
        >
          Ảnh/Video
        </button>
        <button
          onClick={() => setActiveTab("files")}
          className={`text-sm ${activeTab === "files" ? "border-b-2 border-blue-500 font-medium" : ""}`}
        >
          Files
        </button>
        <button
          onClick={() => setActiveTab("links")}
          className={`text-sm ${activeTab === "links" ? "border-b-2 border-blue-500 font-medium" : ""}`}
        >
          Links
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Media content */}
        {activeTab === "media" && (
          <div className="overflow-hidden flex flex-col flex-1">
            {/* Media content */}
            <div className="flex-1 overflow-y-auto w-full h-full">
              {mediaByDate.length > 0 ? (
                mediaByDate.map((group) => (
                  <div key={group.date} className="w-full mb-4">
                    <h3 className="font-medium text-sm px-3 py-2 sticky top-0 bg-white z-10">
                      {group.date}
                    </h3>
                    <div className="grid grid-cols-3 w-full gap-1 px-1">
                      {group.media.map((media, index) => (
                        <div
                          key={`${media.fileId}-${index}`}
                          className="aspect-square rounded-sm overflow-hidden"
                        >
                          <Image
                            src={media.url}
                            alt={media.fileName}
                            className="object-cover w-full h-full"
                            width={500}
                            height={500}
                            unoptimized
                          />
                          {media.metadata?.extension?.match(
                            /mp4|webm|mov/i,
                          ) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <Video className="h-6 w-6 text-white" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-gray-500 px-3 py-1">
                      {group.media.length} ảnh trong {new Date().getFullYear()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex items-center justify-center h-full">
                  <p className="text-gray-500">Không có hình ảnh nào</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Files content */}
        {activeTab === "files" && (
          <div className="flex-1 overflow-hidden flex flex-col h-full">
            {/* Search bar */}
            <div className="p-2 border-b">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm kiếm file"
                  className="w-full pl-8 pr-4 py-2 rounded-full bg-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={fileSearchTerm}
                  onChange={(e) => {
                    setFileSearchTerm(e.target.value);
                    // Filter documents based on search term
                    if (e.target.value.trim() === "") {
                      setFilteredDocumentsByDate(documentsByDate);
                    } else {
                      const searchTerm = e.target.value.toLowerCase();
                      const filtered = documentsByDate
                        .map((group) => ({
                          date: group.date,
                          media: group.media.filter((doc) =>
                            doc.fileName.toLowerCase().includes(searchTerm),
                          ),
                        }))
                        .filter((group) => group.media.length > 0);
                      setFilteredDocumentsByDate(filtered);
                    }
                  }}
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
                      stroke="#6B7280"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Files list */}
            <div className="flex-1 overflow-y-auto">
              {filteredDocumentsByDate.length > 0 ? (
                filteredDocumentsByDate.map((group) => (
                  <div key={group.date} className="mb-4">
                    <h3 className="font-medium text-sm px-3 py-2 sticky top-0 bg-white z-10">
                      {group.date}
                    </h3>
                    <div className="space-y-2">
                      {group.media.map((doc, index) => (
                        <div
                          key={`${doc.fileId}-${index}`}
                          className="flex items-center p-3 hover:bg-gray-100 cursor-pointer"
                          onClick={() => window.open(doc.url, "_blank")}
                        >
                          <div className="bg-blue-100 p-2 rounded-md mr-3">
                            <svg
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
                                stroke="#3B82F6"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M14 2V8H20"
                                stroke="#3B82F6"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M16 13H8"
                                stroke="#3B82F6"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M16 17H8"
                                stroke="#3B82F6"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M10 9H9H8"
                                stroke="#3B82F6"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {doc.fileName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {doc.metadata?.sizeFormatted ||
                                `${Math.round((doc.metadata?.size || 0) / 1024)} KB`}
                            </p>
                          </div>
                          <button className="p-2 text-gray-500 hover:text-gray-700">
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M7 10L12 15L17 10"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M12 15V3"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center h-full">
                  <div className="w-16 h-20 bg-blue-50 rounded-lg flex items-center justify-center mb-2">
                    <div className="w-10 h-12 bg-blue-100 rounded-sm relative">
                      <div className="absolute top-0 right-0 w-3 h-3 bg-blue-50 rounded-br-sm"></div>
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm">Chưa có File</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Links content */}
        {activeTab === "links" && (
          <div className="flex-1 overflow-hidden flex flex-col h-full">
            {/* Search bar */}
            <div className="p-2 border-b">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm kiếm link"
                  className="w-full pl-8 pr-4 py-2 rounded-full bg-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={linkSearchTerm}
                  onChange={(e) => {
                    setLinkSearchTerm(e.target.value);
                    // Filter links based on search term
                    if (e.target.value.trim() === "") {
                      setFilteredLinksByDate(linksByDate);
                    } else {
                      const searchTerm = e.target.value.toLowerCase();
                      const filtered = linksByDate
                        .map((group) => ({
                          date: group.date,
                          links: group.links.filter(
                            (link) =>
                              link.title.toLowerCase().includes(searchTerm) ||
                              link.url.toLowerCase().includes(searchTerm),
                          ),
                        }))
                        .filter((group) => group.links.length > 0);
                      setFilteredLinksByDate(filtered);
                    }
                  }}
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
                      stroke="#6B7280"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Links list */}
            <div className="flex-1 overflow-y-auto">
              {filteredLinksByDate.length > 0 ? (
                filteredLinksByDate.map((group) => (
                  <div key={group.date} className="mb-4">
                    <h3 className="font-medium text-sm px-3 py-2 sticky top-0 bg-white z-10">
                      {group.date}
                    </h3>
                    <div className="space-y-2">
                      {group.links.map((link, index) => {
                        // Extract domain from URL
                        const domain = link.url
                          .replace(/^https?:\/\//, "")
                          .split("/")[0];

                        // Format date as DD/MM
                        const date = new Date(link.timestamp);
                        const formattedDate = `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}`;

                        return (
                          <div
                            key={index}
                            className="flex items-center py-2 px-4 hover:bg-gray-100 cursor-pointer"
                            onClick={() =>
                              window.open(
                                link.url,
                                "_blank",
                                "noopener,noreferrer",
                              )
                            }
                          >
                            <div className="w-10 h-10 rounded-md mr-3 flex items-center justify-center overflow-hidden">
                              {getLinkIcon(domain)}
                            </div>
                            <div className="flex-1 min-w-0 mr-2">
                              <p className="font-medium text-sm truncate max-w-[180px]">
                                {getLinkTitle(
                                  domain,
                                  link.title.length > 40
                                    ? link.title.substring(0, 40) + "..."
                                    : link.title,
                                )}
                              </p>
                              <p className="text-xs text-blue-500 truncate">
                                {domain}
                              </p>
                            </div>
                            <div className="text-xs text-gray-500 whitespace-nowrap">
                              {formattedDate}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center h-full">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-2">
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M9 17H7C5.89543 17 5 16.1046 5 15V9C5 7.89543 5.89543 7 7 7H9M15 17H17C18.1046 17 19 16.1046 19 15V9C19 7.89543 18.1046 7 17 7H15M9 12H15"
                        stroke="#93C5FD"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">Chưa có Link</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
