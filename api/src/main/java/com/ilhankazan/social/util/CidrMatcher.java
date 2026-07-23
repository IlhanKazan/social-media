package com.ilhankazan.social.util;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.List;

public final class CidrMatcher {

    private CidrMatcher() {}

    public static boolean matchesAny(String ipAddress, List<String> cidrs) {
        InetAddress address;
        try {
            address = InetAddress.getByName(ipAddress);
        } catch (UnknownHostException e) {
            return false;
        }

        for (String cidr : cidrs) {
            if (matches(address, cidr)) {
                return true;
            }
        }
        return false;
    }

    private static boolean matches(InetAddress address, String cidr) {
        String[] parts = cidr.split("/", 2);
        InetAddress network;
        try {
            network = InetAddress.getByName(parts[0]);
        } catch (UnknownHostException e) {
            return false;
        }

        byte[] addressBytes = address.getAddress();
        byte[] networkBytes = network.getAddress();
        if (addressBytes.length != networkBytes.length) {
            return false;
        }

        int prefixLength = parts.length == 2
            ? Integer.parseInt(parts[1])
            : addressBytes.length * 8;

        int fullBytes = prefixLength / 8;
        int remainingBits = prefixLength % 8;

        for (int i = 0; i < fullBytes; i++) {
            if (addressBytes[i] != networkBytes[i]) {
                return false;
            }
        }

        if (remainingBits > 0) {
            int mask = 0xFF << (8 - remainingBits);
            if ((addressBytes[fullBytes] & mask) != (networkBytes[fullBytes] & mask)) {
                return false;
            }
        }

        return true;
    }
}
