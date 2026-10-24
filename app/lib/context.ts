import {createContext} from 'react-router';
import type {Env} from './types';
export const cloudflareContext=createContext<{env:Env;ctx:ExecutionContext}>();
