---
title: Hold bytes on a cork screw.
date: 2026-10-04
tag: cd
layout: post
---
Hello! Today I'll show you how to make the CD. This version works, but it's a bit buggy and only holds 8 bytes.

What you'll need: an Arduino for reading the data, 9 jumper wires, a cork, aluminum foil tape, and a pen or pencil dark enough to read clearly.

First, with a pen or a good pencil, clearly write 12345678. These will be our bytes. Make sure they're evenly spaced.

Second, add a dot under each byte.

Now remember the aluminum foil you got? Take a small piece about the size of the cork and tape it on firmly. This aluminum foil is the 1. Make sure it's really tight, or it will read wrong.

Now take one of the wires and connect the aluminum foil to ground on your Arduino. Once that's done, put the other 8 wires on the dots. Put spot 1 on digital pin 2, spot 2 on pin 3, and so on. Once you reach spot 8, put it on pin 9.

Upload this code to your Arduino. 

```
const int pins[8] = {2, 3, 4, 5, 6, 7, 8, 9};  // spot 1 to spot 8

void setup() {
  Serial.begin(9600);
  for (int i = 0; i < 8; i++) pinMode(pins[i], INPUT_PULLUP);
}

void loop() {
  byte value = 0;
  Serial.print("Bits: ");
  for (int i = 0; i < 8; i++) {
    int bit = (digitalRead(pins[i]) == LOW) ? 1 : 0;
    Serial.print(bit);
    value = (value << 1) | bit;
  }
  Serial.print("  Number: ");
  Serial.print(value);
  Serial.print("  Letter: ");
  Serial.println((char)value);
  delay(1000);
}

```

Run the code and open the serial monitor on 9600 baud and you should see it now remember one cork can only store 8 bytes so like up to 255 and one letter but it’s still cool 

Anyway goodbye I hope this works out for you and have a good time.