#!/usr/env python
from subprocess import Popen, PIPE
p1 = Popen(["echo","content.location.reload()"], stdout=PIPE)
p2 = Popen(["nc","-q","1","localhost","4242"], stdin=p1.stdout, stdout=PIPE)
output = p2.communicate()[0]