; Player196, bank18, origin $B100 (50 bytes).
; Hook bank18 $840E replaces JSR $81F4 with JMP $B100.
; Native page save and native hit calculation are preserved.
JSR $81F4
LDA $73FE
CMP #$B5
BNE original_advance
LDA $73C0
BEQ original_advance
LDY #$00
LDX #$00
scan:
LDA $02A2,Y
CMP #$40
BCC repeat
INX
TYA
CLC
ADC #$12
TAY
CPX #$05
BCC scan
JMP $8411
repeat:
LDA #$01
STA $73FD
JMP $844C
original_advance:
JMP $8411
