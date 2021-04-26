// @ts-nocheck
import {
    render,
    Component,
    h,
    cloneElement,
    createContext,
    hydrate,
} from "https://esm.sh/preact@10.5.13"
import {
    useEffect,
    useLayoutEffect,
    useState,
    useRef,
    useMemo,
    useContext,
} from "https://esm.sh/preact@10.5.13/hooks"

import htm from "https://esm.sh/htm@3.0.4"

const html = htm.bind(h);

export { html, render, Component, useEffect, useLayoutEffect, useState, useRef, useMemo, createContext, useContext, h, cloneElement, hydrate }
