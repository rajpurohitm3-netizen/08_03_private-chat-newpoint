"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { toast } from "sonner";
import {
  UserPlus,
  Check,
  X,
  Clock,
  Users,
  Send,
  Heart,
  Shield,
  Ban,
  ChevronRight,
  Search,
  UserMinus
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  sender?: any;
  receiver?: any;
}

interface FriendRequestsProps {
  userId: string;
  onFriendsUpdate?: (friends: string[]) => void;
}

export function FriendRequests({ userId, onFriendsUpdate }: FriendRequestsProps) {
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"requests" | "friends" | "blocked" | "find">("requests");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    setupRealtimeSubscription();
  }, [userId]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("friend-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "friend_requests" }, () => {
        fetchData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "blocked_users" }, () => {
        fetchData();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const fetchData = async () => {
    await Promise.all([
      fetchIncomingRequests(),
      fetchOutgoingRequests(),
      fetchFriends(),
      fetchBlockedUsers(),
      fetchAllUsers()
    ]);
    setLoading(false);
  };

  const fetchIncomingRequests = async () => {
    const { data } = await supabase
      .from("friend_requests")
      .select("*, sender:profiles!friend_requests_sender_id_fkey(*)")
      .eq("receiver_id", userId)
      .eq("status", "pending");
    if (data) setIncomingRequests(data);
  };

  const fetchOutgoingRequests = async () => {
    const { data } = await supabase
      .from("friend_requests")
      .select("*, receiver:profiles!friend_requests_receiver_id_fkey(*)")
      .eq("sender_id", userId)
      .eq("status", "pending");
    if (data) setOutgoingRequests(data);
  };

  const fetchFriends = async () => {
    const { data: accepted } = await supabase
      .from("friend_requests")
      .select("*, sender:profiles!friend_requests_sender_id_fkey(*), receiver:profiles!friend_requests_receiver_id_fkey(*)")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq("status", "accepted");

    if (accepted) {
      const friendsList = accepted.map((req) => {
        if (req.sender_id === userId) {
          return req.receiver;
        }
        return req.sender;
      }).filter(Boolean);
      setFriends(friendsList);
      onFriendsUpdate?.(friendsList.map(f => f.id));
    }
  };

  const fetchBlockedUsers = async () => {
    const { data } = await supabase
      .from("blocked_users")
      .select("*, blocked:profiles!blocked_users_blocked_id_fkey(*)")
      .eq("blocker_id", userId);
    if (data) setBlockedUsers(data);
  };

  const fetchAllUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .neq("id", userId);
    if (data) setAllUsers(data);
  };

  const sendFriendRequest = async (receiverId: string) => {
    const existingRequest = await supabase
      .from("friend_requests")
      .select("*")
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${userId})`)
      .single();

    if (existingRequest.data) {
      toast.error("Request already exists");
      return;
    }

    const { error } = await supabase.from("friend_requests").insert({
      sender_id: userId,
      receiver_id: receiverId,
      status: "pending"
    });

    if (error) {
      toast.error("Failed to send request");
    } else {
      toast.success("Friend request sent!");
      fetchData();
    }
  };

  const acceptRequest = async (requestId: string) => {
    const { error } = await supabase
      .from("friend_requests")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", requestId);

    if (error) {
      toast.error("Failed to accept");
    } else {
      toast.success("Friend request accepted!");
      fetchData();
    }
  };

  const rejectRequest = async (requestId: string) => {
    const { error } = await supabase
      .from("friend_requests")
      .delete()
      .eq("id", requestId);

    if (error) {
      toast.error("Failed to reject");
    } else {
      toast.success("Request declined");
      fetchData();
    }
  };

  const cancelRequest = async (requestId: string) => {
    const { error } = await supabase
      .from("friend_requests")
      .delete()
      .eq("id", requestId);

    if (error) {
      toast.error("Failed to cancel");
    } else {
      toast.success("Request cancelled");
      fetchData();
    }
  };

  const removeFriend = async (friendId: string) => {
    const { error } = await supabase
      .from("friend_requests")
      .delete()
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`);

    if (error) {
      toast.error("Failed to remove friend");
    } else {
      toast.success("Friend removed");
      fetchData();
    }
  };

  const blockUser = async (blockedId: string) => {
    await supabase
      .from("friend_requests")
      .delete()
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${blockedId}),and(sender_id.eq.${blockedId},receiver_id.eq.${userId})`);

    const { error } = await supabase.from("blocked_users").insert({
      blocker_id: userId,
      blocked_id: blockedId
    });

    if (error) {
      toast.error("Failed to block user");
    } else {
      toast.success("User blocked");
      fetchData();
    }
  };

  const unblockUser = async (blockedId: string) => {
    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("blocker_id", userId)
      .eq("blocked_id", blockedId);

    if (error) {
      toast.error("Failed to unblock");
    } else {
      toast.success("User unblocked");
      fetchData();
    }
  };

  const getRelationshipStatus = (targetUserId: string) => {
    if (friends.some(f => f.id === targetUserId)) return "friend";
    if (outgoingRequests.some(r => r.receiver_id === targetUserId)) return "pending_sent";
    if (incomingRequests.some(r => r.sender_id === targetUserId)) return "pending_received";
    if (blockedUsers.some(b => b.blocked_id === targetUserId)) return "blocked";
    return "none";
  };

  const filteredUsers = allUsers.filter(user => 
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !blockedUsers.some(b => b.blocked_id === user.id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-500 rounded-2xl">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Connections</h2>
            <p className="text-sm text-white/40">Manage your friendships</p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {[
            { id: "requests", label: "Requests", icon: Clock, count: incomingRequests.length },
            { id: "friends", label: "Friends", icon: Heart, count: friends.length },
            { id: "blocked", label: "Blocked", icon: Ban, count: blockedUsers.length },
            { id: "find", label: "Find", icon: Search }
          ].map((tab) => (
            <Button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`h-12 px-4 rounded-xl font-bold uppercase text-xs whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id
                  ? "bg-indigo-600"
                  : "bg-white/5 text-white/40 hover:text-white"
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-[10px]">{tab.count}</span>
              )}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <AnimatePresence mode="wait">
          {activeTab === "requests" && (
            <motion.div
              key="requests"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-white/40 mb-4">
                  Approval for Friendship ({incomingRequests.length})
                </h3>
                {incomingRequests.length === 0 ? (
                  <div className="text-center py-8 bg-white/[0.02] rounded-2xl border border-white/5">
                    <Clock className="w-12 h-12 text-white/10 mx-auto mb-3" />
                    <p className="text-white/30 text-sm">No pending requests</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {incomingRequests.map((req) => (
                      <motion.div
                        key={req.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all"
                      >
                        <AvatarDisplay profile={req.sender} className="h-12 w-12" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold truncate">{req.sender?.username}</p>
                          <p className="text-xs text-amber-400 uppercase tracking-wider font-bold">Wants to connect</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => acceptRequest(req.id)}
                            size="icon"
                            className="h-10 w-10 rounded-xl bg-emerald-600 hover:bg-emerald-700"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => rejectRequest(req.id)}
                            size="icon"
                            variant="ghost"
                            className="h-10 w-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-white/40 mb-4">
                  Sent Requests ({outgoingRequests.length})
                </h3>
                {outgoingRequests.length === 0 ? (
                  <div className="text-center py-8 bg-white/[0.02] rounded-2xl border border-white/5">
                    <Send className="w-12 h-12 text-white/10 mx-auto mb-3" />
                    <p className="text-white/30 text-sm">No pending sent requests</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {outgoingRequests.map((req) => (
                      <motion.div
                        key={req.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl"
                      >
                        <AvatarDisplay profile={req.receiver} className="h-12 w-12" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold truncate">{req.receiver?.username}</p>
                          <p className="text-xs text-white/40 uppercase tracking-wider">Pending approval</p>
                        </div>
                        <Button
                          onClick={() => cancelRequest(req.id)}
                          variant="ghost"
                          className="h-10 px-4 rounded-xl text-white/40 hover:text-red-400"
                        >
                          Cancel
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "friends" && (
            <motion.div
              key="friends"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {friends.length === 0 ? (
                <div className="text-center py-16">
                  <Heart className="w-16 h-16 text-white/10 mx-auto mb-4" />
                  <p className="text-white/30 text-lg font-bold">No friends yet</p>
                  <p className="text-white/20 text-sm mt-2">Find people and send friend requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {friends.map((friend) => (
                    <motion.div
                      key={friend.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all group"
                    >
                      <AvatarDisplay profile={friend} className="h-12 w-12" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{friend.username}</p>
                        <p className="text-xs text-emerald-400 uppercase tracking-wider font-bold flex items-center gap-1">
                          <Heart className="w-3 h-3 fill-current" /> Friend
                        </p>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          onClick={() => blockUser(friend.id)}
                          size="icon"
                          variant="ghost"
                          className="h-10 w-10 rounded-xl text-white/20 hover:text-orange-400 hover:bg-orange-500/10"
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => removeFriend(friend.id)}
                          size="icon"
                          variant="ghost"
                          className="h-10 w-10 rounded-xl text-white/20 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "blocked" && (
            <motion.div
              key="blocked"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {blockedUsers.length === 0 ? (
                <div className="text-center py-16">
                  <Shield className="w-16 h-16 text-white/10 mx-auto mb-4" />
                  <p className="text-white/30 text-lg font-bold">No blocked users</p>
                  <p className="text-white/20 text-sm mt-2">Blocked users won't be able to contact you</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {blockedUsers.map((blocked) => (
                    <motion.div
                      key={blocked.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-4 p-4 bg-red-500/5 border border-red-500/10 rounded-2xl"
                    >
                      <AvatarDisplay profile={blocked.blocked} className="h-12 w-12 opacity-50" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate text-white/50">{blocked.blocked?.username}</p>
                        <p className="text-xs text-red-400 uppercase tracking-wider font-bold">Blocked</p>
                      </div>
                      <Button
                        onClick={() => unblockUser(blocked.blocked_id)}
                        variant="ghost"
                        className="h-10 px-4 rounded-xl text-white/40 hover:text-emerald-400"
                      >
                        Unblock
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "find" && (
            <motion.div
              key="find"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 bg-white/5 border-white/10 rounded-xl"
                />
              </div>

              <div className="space-y-3">
                {searchQuery.trim() === "" ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Search className="w-12 h-12 text-white/10 mb-4" />
                    <p className="text-white/40 text-sm">Enter a username to find users</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="w-12 h-12 text-white/10 mb-4" />
                    <p className="text-white/40 text-sm">No users found</p>
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const status = getRelationshipStatus(user.id);
                    return (
                      <motion.div
                        key={user.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all"
                      >
                        <AvatarDisplay profile={user} className="h-12 w-12" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold truncate">{user.username}</p>
                          {status === "friend" && (
                            <p className="text-xs text-emerald-400 uppercase tracking-wider font-bold flex items-center gap-1">
                              <Heart className="w-3 h-3 fill-current" /> Friend
                            </p>
                          )}
                          {status === "pending_sent" && (
                            <p className="text-xs text-amber-400 uppercase tracking-wider font-bold">Request Sent</p>
                          )}
                          {status === "pending_received" && (
                            <p className="text-xs text-indigo-400 uppercase tracking-wider font-bold">Wants to connect</p>
                          )}
                          {status === "none" && (
                            <p className="text-xs text-white/30 uppercase tracking-wider">Not connected</p>
                          )}
                        </div>
                        {status === "none" && (
                          <Button
                            onClick={() => sendFriendRequest(user.id)}
                            className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold uppercase text-xs"
                          >
                            <UserPlus className="w-4 h-4 mr-2" /> Add
                          </Button>
                        )}
                        {status === "pending_received" && (
                          <Button
                            onClick={() => {
                              const req = incomingRequests.find(r => r.sender_id === user.id);
                              if (req) acceptRequest(req.id);
                            }}
                            className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold uppercase text-xs"
                          >
                            <Check className="w-4 h-4 mr-2" /> Accept
                          </Button>
                        )}
                        {status === "pending_sent" && (
                          <span className="text-xs text-amber-400/60 uppercase tracking-wider">Pending</span>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
