"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "@/lib/authContext";
import AuthModal from "../components/AuthModal";
import {
  Mail, Copy, RefreshCw, CheckCircle, Shield, Inbox, Loader2,
  Clock, User, FileText, AlertCircle
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import {
  getTempEmailDomains,
  createTempEmailAccount,
  getTempEmailMessages,
  readTempEmailMessage,
} from "@/lib/tempEmailApi";

export default function FakeEmailGenerator() {
  const { user, trackUsage } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("login");

  // Email state
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [accountId, setAccountId] = useState("");
  const [copied, setCopied] = useState(false);

  // Domain state
  const [availableDomains, setAvailableDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [loadingDomains, setLoadingDomains] = useState(true);

  // Inbox state
  const [inboxEmails, setInboxEmails] = useState([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedEmailMsg, setSelectedEmailMsg] = useState(null);
  const [loadingFullMsg, setLoadingFullMsg] = useState(false);
  const [inboxNewCount, setInboxNewCount] = useState(0);

  // History and loading
  const [emailHistory, setEmailHistory] = useState([]);
  const [loadingEmail, setLoadingEmail] = useState(false);

  // Refs
  const intervalRef = useRef(null);
  const prevInboxCountRef = useRef(0);

  // ─── Fetch available domains on mount ──────────────────────
  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const domains = await getTempEmailDomains();

        if (Array.isArray(domains) && domains.length > 0) {
          setAvailableDomains(domains);
          setSelectedDomain(domains[0]);
        } else {
          console.warn("No domains returned from API");
          toast.error("Failed to load email domains. Please refresh the page.");
        }
      } catch (err) {
        console.error("Error fetching domains:", err);
        toast.error("Failed to connect to email service.");
      } finally {
        setLoadingDomains(false);
      }
    };
    fetchDomains();
  }, []);

  // ─── Generate random string ────────────────────────────────
  const generateRandomString = (length = 10) => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }
    return result;
  };

  // ─── Generate a new email account ──────────────────────────
  const generateEmail = useCallback(async () => {
    if (!user) {
      toast.error("Please sign in to use Fake Email Generator");
      setAuthModalMode("login");
      setAuthModalOpen(true);
      return;
    }

    if (loadingDomains || availableDomains.length === 0) {
      toast.error("Domains are still loading. Please wait a moment.");
      return;
    }

    setLoadingEmail(true);
    try {
      const username = generateRandomString(10);
      const domain = selectedDomain || availableDomains[0];
      const address = `${username}@${domain}`;
      const password = generateRandomString(20);

      // Create account via Mail.tm (browser — Vercel server IPs are blocked)
      const data = await createTempEmailAccount(address, password);

      if (!data.success || !data.token) {
        throw new Error(data.error || "Failed to create email account");
      }

      setEmail(data.email);
      setToken(data.token);
      setAccountId(data.id || "");
      setCopied(false);
      setInboxEmails([]);
      setSelectedEmailMsg(null);
      setAutoRefresh(true);
      prevInboxCountRef.current = 0;
      setInboxNewCount(0);

      // Add to history
      setEmailHistory((prev) => {
        const filtered = prev.filter((e) => e.email !== data.email);
        return [
          { email: data.email, token: data.token, id: data.id || "" },
          ...filtered,
        ].slice(0, 10);
      });

      toast.success("Email created! Inbox is now active.");

      if (user && trackUsage) {
        trackUsage("/fake-email-generator", 1, 1, {
          tool: "Fake Email Generator",
        });
      }
    } catch (error) {
      console.error("Generate email error:", error);
      toast.error(error.message || "Failed to generate email. Please try again.");
    } finally {
      setLoadingEmail(false);
    }
  }, [selectedDomain, availableDomains, loadingDomains, user, trackUsage]);

  // ─── Check inbox for new emails ────────────────────────────
  const fetchInbox = useCallback(
    async (showToast = false) => {
      if (!user) {
        if (showToast) {
          toast.error("Please sign in to check inbox");
          setAuthModalMode("login");
          setAuthModalOpen(true);
        }
        return;
      }

      if (!email || !token) {
        console.warn("Cannot fetch inbox: missing email or token", { email, hasToken: !!token });
        return;
      }

      setLoadingInbox(true);
      try {
        const data = await getTempEmailMessages(token);

        // Log response for debugging
        console.log("Inbox fetch response:", {
          success: data.success,
          messageCount: data.messages?.length || 0,
          count: data.count,
          error: data.error,
        });

        if (data.success) {
          const messages = data.messages || [];

          // Verify account email matches (for debugging)
          if (data.accountEmail && data.accountEmail !== email) {
            console.warn(
              `Account email mismatch! UI shows: ${email}, API returned: ${data.accountEmail}`
            );
          }

          // Check for new emails
          if (
            messages.length > prevInboxCountRef.current &&
            prevInboxCountRef.current > 0
          ) {
            const newCount = messages.length - prevInboxCountRef.current;
            setInboxNewCount(newCount);
            toast.success(
              `${newCount} new email${newCount > 1 ? "s" : ""} received!`
            );
          }
          prevInboxCountRef.current = messages.length;

          setInboxEmails(messages);
          if (showToast && messages.length === 0) {
            toast("No emails yet. Waiting for messages...", { icon: "📭" });
          }
        } else {
          console.error("Inbox fetch failed:", data.error, data);
          if (showToast) {
            toast.error(data.error || "Failed to check inbox");
          }
        }
      } catch (error) {
        console.error("Inbox fetch error:", error);
        if (showToast) {
          toast.error("Failed to check inbox");
        }
      } finally {
        setLoadingInbox(false);
      }
    },
    [email, token, user]
  );

  // ─── Read full email content ───────────────────────────────
  const readFullEmail = useCallback(
    async (msg) => {
      if (!token || !msg?.id) return;

      // Toggle off if already selected
      if (selectedEmailMsg?.id === msg.id) {
        setSelectedEmailMsg(null);
        return;
      }

      setLoadingFullMsg(true);
      try {
        const data = await readTempEmailMessage(token, msg.id);

        if (data.success) {
          setSelectedEmailMsg({
            id: msg.id,
            from: data.from || msg.from,
            fromName: data.fromName || "",
            subject: data.subject || msg.subject,
            date: data.date || msg.date,
            htmlBody: data.htmlBody || "",
            textBody: data.textBody || "",
            attachments: data.attachments || [],
          });
        } else {
          toast.error("Failed to load email content");
        }
      } catch (error) {
        console.error("Read email error:", error);
        toast.error("Failed to load email");
      } finally {
        setLoadingFullMsg(false);
      }
    },
    [token, selectedEmailMsg]
  );

  // ─── Auto-refresh inbox ────────────────────────────────────
  useEffect(() => {
    if (autoRefresh && email && token) {
      fetchInbox();

      intervalRef.current = setInterval(() => {
        fetchInbox();
      }, 7000); // Check every 7 seconds

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [autoRefresh, email, token, fetchInbox]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ─── Copy to clipboard ────────────────────────────────────
  const copyToClipboard = (text) => {
    if (!text) {
      toast.error("Generate an email first");
      return;
    }
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Email copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── Switch to a history email ─────────────────────────────
  const switchToEmail = (historyItem) => {
    setEmail(historyItem.email);
    setToken(historyItem.token);
    setAccountId(historyItem.id || "");
    setInboxEmails([]);
    setSelectedEmailMsg(null);
    setAutoRefresh(true);
    prevInboxCountRef.current = 0;
    setInboxNewCount(0);
    toast.success(`Switched to ${historyItem.email}`);
  };

  // ─── Format date ──────────────────────────────────────────
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium mb-4">
              <Shield className="w-3.5 h-3.5" />
              Temporary Email • Real Inbox
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
              Fake Email Generator
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Generate real temporary email addresses with inbox support. Receive
              emails instantly — perfect for sign-ups, testing, and privacy
              protection.
            </p>
          </div>

          {/* Email Display */}
          <Card className="border-2 border-green-200 dark:border-green-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-green-600" />
                Your Temporary Email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={email}
                  readOnly
                  placeholder="Click 'Generate' to create a temporary email"
                  className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg font-mono text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <Button
                  onClick={() => copyToClipboard(email)}
                  disabled={!email}
                  className={cn(
                    "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700",
                    copied && "bg-green-600"
                  )}
                >
                  {copied ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </Button>
              </div>

              {email && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">
                      This email is active and can receive real emails.
                    </span>{" "}
                    Copy it, use it for sign-ups, and check inbox below.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Domain Selection & Generate */}
          <Card>
            <CardHeader>
              <CardTitle>Select Domain & Generate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Domain selector */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  Select Domain
                  <Badge className="bg-green-100 text-green-700 text-[10px]">
                    All domains support inbox
                  </Badge>
                </label>
                {loadingDomains ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading available domains...
                  </div>
                ) : availableDomains.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-red-500">
                    <AlertCircle className="w-4 h-4" />
                    No domains available. Please refresh the page.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {availableDomains.map((domain) => (
                      <button
                        key={domain}
                        onClick={() => setSelectedDomain(domain)}
                        className={cn(
                          "px-3 py-2.5 text-sm rounded-lg border transition-colors",
                          selectedDomain === domain
                            ? "bg-green-600 text-white border-green-600"
                            : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:border-green-500"
                        )}
                      >
                        @{domain}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Generate button */}
              <Button
                onClick={generateEmail}
                disabled={loadingEmail || loadingDomains || availableDomains.length === 0}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-6 text-lg"
              >
                {loadingEmail ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Generate Email Address
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Inbox Section */}
          {email && (
            <Card className="border-2 border-green-200 dark:border-green-800">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Inbox className="w-5 h-5 text-green-600" />
                    Inbox
                    {inboxEmails.length > 0 && (
                      <Badge className="bg-green-600 text-white">
                        {inboxEmails.length}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoRefresh}
                        onChange={(e) => setAutoRefresh(e.target.checked)}
                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                      />
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Auto-refresh
                      </span>
                    </label>
                    {autoRefresh && (
                      <Badge
                        variant="outline"
                        className="text-green-600 border-green-300 text-[10px]"
                      >
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Live
                      </Badge>
                    )}
                    <Button
                      onClick={() => fetchInbox(true)}
                      disabled={loadingInbox}
                      variant="outline"
                      size="sm"
                      className="border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                    >
                      {loadingInbox ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {inboxEmails.length === 0 ? (
                  <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                    <div className="relative inline-block">
                      <Mail className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      {autoRefresh && (
                        <div className="absolute -top-1 -right-1">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-lg font-medium">
                      Waiting for emails...
                    </p>
                    <p className="text-sm mt-1">
                      Send an email to{" "}
                      <span className="font-mono text-green-600 font-medium">
                        {email}
                      </span>
                    </p>
                    <p className="text-xs mt-2 text-gray-500">
                      Make sure you're sending to the exact address above. Emails may take 10-30 seconds to appear.
                    </p>
                    <p className="text-xs mt-3 text-gray-400">
                      {autoRefresh
                        ? "Checking every 7 seconds automatically"
                        : "Click the refresh button to check manually"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {inboxEmails.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "p-4 border rounded-lg cursor-pointer transition-all",
                          selectedEmailMsg?.id === msg.id
                            ? "border-green-500 bg-green-50 dark:bg-green-900/20 shadow-sm"
                            : "border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 hover:shadow-sm"
                        )}
                        onClick={() => readFullEmail(msg)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="w-4 h-4 text-green-600 flex-shrink-0" />
                              <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                {msg.from || "Unknown Sender"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                              <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="font-semibold text-gray-900 dark:text-white truncate">
                                {msg.subject || "(No Subject)"}
                              </span>
                            </div>
                            {msg.intro && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1 ml-6">
                                {msg.intro}
                              </p>
                            )}
                            {msg.date && (
                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                                <Clock className="w-3 h-3" />
                                {formatDate(msg.date)}
                              </div>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className="text-[10px] flex-shrink-0 border-green-300 text-green-600"
                          >
                            {loadingFullMsg &&
                            selectedEmailMsg?.id !== msg.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : selectedEmailMsg?.id === msg.id ? (
                              "Close"
                            ) : (
                              "Read"
                            )}
                          </Badge>
                        </div>

                        {/* Expanded email content */}
                        {selectedEmailMsg?.id === msg.id && (
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            {/* Sender details */}
                            {selectedEmailMsg.fromName && (
                              <p className="text-xs text-gray-500 mb-2">
                                From: {selectedEmailMsg.fromName} &lt;{selectedEmailMsg.from}&gt;
                              </p>
                            )}
                            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-100 dark:border-gray-800">
                              {selectedEmailMsg.htmlBody ? (
                                <div
                                  dangerouslySetInnerHTML={{
                                    __html: selectedEmailMsg.htmlBody,
                                  }}
                                  className="text-sm text-gray-700 dark:text-gray-300 prose prose-sm max-w-none dark:prose-invert overflow-auto"
                                  style={{ maxHeight: "400px" }}
                                />
                              ) : (
                                <pre
                                  className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-sans overflow-auto"
                                  style={{ maxHeight: "400px" }}
                                >
                                  {selectedEmailMsg.textBody || "No content"}
                                </pre>
                              )}
                            </div>

                            {selectedEmailMsg.attachments &&
                              selectedEmailMsg.attachments.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                                    📎 Attachments (
                                    {selectedEmailMsg.attachments.length})
                                  </p>
                                  <div className="space-y-1">
                                    {selectedEmailMsg.attachments.map(
                                      (att, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-center gap-2 text-xs text-gray-500 p-2 bg-gray-50 dark:bg-gray-800 rounded"
                                        >
                                          <FileText className="w-3 h-3" />
                                          {att.filename ||
                                            `Attachment ${idx + 1}`}
                                          {att.size && (
                                            <span className="text-gray-400">
                                              ({(att.size / 1024).toFixed(1)} KB)
                                            </span>
                                          )}
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Email History */}
          {emailHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Generated Emails
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {emailHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg transition-colors",
                        item.email === email
                          ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                          : "bg-gray-50 dark:bg-gray-800"
                      )}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {item.email === email && (
                          <Badge className="bg-green-600 text-white text-[9px] px-1.5">
                            Active
                          </Badge>
                        )}
                        <span className="font-mono text-sm text-gray-900 dark:text-white truncate">
                          {item.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {item.email !== email && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => switchToEmail(item)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Inbox className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(item.email);
                            toast.success("Email copied!");
                          }}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info */}
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    <p className="font-medium">Real Working Inbox</p>
                    <p>
                      Each generated email creates a real mailbox that can receive
                      messages. Send any email to the generated address and it will
                      appear in the inbox within seconds.
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    <p className="font-medium">Privacy First</p>
                    <p>
                      Emails are temporary and auto-deleted. Use them for sign-ups,
                      testing, or anywhere you don{"'"}t want to use your real email.
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    <p className="font-medium">Important Note</p>
                    <p>
                      Do not use for sensitive information. These temporary emails
                      are meant for testing and sign-ups only. They may expire after
                      some time.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authModalMode}
        onModeChange={setAuthModalMode}
      />
    </div>
  );
}
