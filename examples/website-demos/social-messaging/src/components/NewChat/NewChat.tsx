import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar, useChatContext } from 'stream-chat-react';
import type { UserResponse } from 'stream-chat';
import _debounce from 'lodash/debounce';

import { NewChatUser } from './NewChatUser';
import { UserType } from '../ChatContainer/ChatContainer';
import { AddChat } from '../../assets';

import './NewChat.scss';

export const NewChat = () => {
  const { client, setActiveChannel } = useChatContext();
  const [focusedUser, setFocusedUser] = useState<number>();
  const [inputText, setInputText] = useState('');
  const [resultsOpen, setResultsOpen] = useState(false);
  const [searchEmpty, setSearchEmpty] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<UserResponse<UserType>[]>([]);
  const [users, setUsers] = useState<UserResponse<UserType>[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  const clearState = () => {
    setInputText('');
    setResultsOpen(false);
    setSearchEmpty(false);
  };

  const findUsers = async () => {
    if (searching) return;
    setSearching(true);

    try {
      const response = await client.queryUsers(
        {
          id: { $ne: client.userID as string },
          $and: [{ name: { $autocomplete: inputText } }],
        },
        { id: 1 },
        { limit: 6 },
      );

      if (!response.users.length) {
        setSearchEmpty(true);
      } else {
        setSearchEmpty(false);
        setUsers(response.users);
      }

      setResultsOpen(true);
    } catch (error) {
      console.log({ error });
    }

    setSearching(false);
  };

  const findUsersDebounce = _debounce(findUsers, 100, {
    trailing: true,
  });

  useEffect(() => {
    if (inputText) {
      findUsersDebounce();
    }
  }, [inputText]); // eslint-disable-line react-hooks/exhaustive-deps

  const createChannel = async () => {
    const selectedUsersIds = selectedUsers.map((user) => user.id);

    if (!selectedUsersIds.length || !client.userID) return;

    const conversation = await client.channel('messaging', {
      members: [...selectedUsersIds, client.userID],
    });

    await conversation.watch();

    setActiveChannel?.(conversation);
    setSelectedUsers([]);
    setUsers([]);
    setInputText('');
  };

  const addUser = (addedUser: UserResponse<UserType>) => {
    const isAlreadyAdded = selectedUsers.find((user) => user.id === addedUser.id);
    if (isAlreadyAdded) return;

    setSelectedUsers([...selectedUsers, addedUser]);
    setResultsOpen(false);
    setInputText('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const removeUser = (user: UserResponse<UserType>) => {
    const newUsers = selectedUsers.filter((selected) => selected.id !== user.id);
    setSelectedUsers(newUsers);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // check for up(ArrowUp) or down(ArrowDown) key
      if (event.key === 'ArrowUp') {
        setFocusedUser((prevFocused) => {
          if (prevFocused === undefined) return 0;
          return prevFocused === 0 ? users.length - 1 : prevFocused - 1;
        });
      }
      if (event.key === 'ArrowDown') {
        setFocusedUser((prevFocused) => {
          if (prevFocused === undefined) return 0;
          return prevFocused === users.length - 1 ? 0 : prevFocused + 1;
        });
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        if (focusedUser !== undefined) {
          addUser(users[focusedUser]);
          return setFocusedUser(undefined);
        }
      }
    },
    [users, focusedUser], // eslint-disable-line
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown, false);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className='new-chat'>
      <div className='new-chat-input'>
        <div className='new-chat-input-to'>TO: </div>
        <div className='new-chat-input-main'>
          {!!selectedUsers?.length && (
            <div className='new-chat-input-main-selected'>
              {selectedUsers.map((user) => (
                <div
                  className='new-chat-input-main-selected-user'
                  onClick={() => removeUser(user)}
                  key={user.id}
                >
                  <Avatar
                    image={(user?.image as string) || ''}
                    name={user?.name || 'User'}
                    size={28}
                  />
                  <div className='new-chat-input-main-selected-user-name'>{user.name}</div>
                </div>
              ))}
            </div>
          )}
          <div className='new-chat-input-main-form'>
            <form>
              <input
                autoFocus
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={!selectedUsers.length ? 'Type a name' : ''}
                size={17}
                type='text'
              />
            </form>
            <AddChat createChannel={createChannel} />
          </div>
        </div>
      </div>
      {inputText && (
        <div className='new-chat-options'>
          {!!users?.length && !searchEmpty && (
            <>
              {users.map((user, i) => (
                <div
                  className={`new-chat-options-option ${focusedUser === i && 'focused'}`}
                  onClick={() => addUser(user)}
                  key={user.id}
                >
                  <NewChatUser user={user} />
                </div>
              ))}
            </>
          )}
          {searchEmpty && (
            <div
              onClick={() => {
                inputRef.current?.focus();
                clearState();
              }}
              className='new-chat-options-empty'
            >
              No people found...
            </div>
          )}
        </div>
      )}
    </div>
  );
};
